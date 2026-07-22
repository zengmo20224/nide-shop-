module.exports = class extends think.Model {
  getUserTable() {
    return '`' + this.tablePrefix + 'user`';
  }

  getAccountLogTable() {
    return '`' + this.tablePrefix + 'account_log`';
  }

  async ensureAccountSchema() {
    const userTable = this.getUserTable();
    const logTable = this.getAccountLogTable();
    const columns = await this.query(`SHOW COLUMNS FROM ${userTable} LIKE 'balance'`);

    if (think.isEmpty(columns)) {
      await this.execute(`ALTER TABLE ${userTable} ADD COLUMN \`balance\` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '账户余额' AFTER \`weixin_openid\``);
    }

    await this.execute(`CREATE TABLE IF NOT EXISTS ${logTable} (
      \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
      \`user_id\` mediumint(8) unsigned NOT NULL DEFAULT '0',
      \`type\` varchar(20) NOT NULL DEFAULT '',
      \`amount\` decimal(10,2) NOT NULL DEFAULT '0.00',
      \`balance_after\` decimal(10,2) NOT NULL DEFAULT '0.00',
      \`order_id\` mediumint(8) unsigned NOT NULL DEFAULT '0',
      \`remark\` varchar(255) NOT NULL DEFAULT '',
      \`add_time\` int(11) unsigned NOT NULL DEFAULT '0',
      PRIMARY KEY (\`id\`),
      KEY \`user_id\` (\`user_id\`),
      KEY \`order_id\` (\`order_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  async ensureOfficialSchema() {
    const userTable = this.getUserTable();
    const fields = [
      { name: 'official_openid', sql: "`official_openid` varchar(64) NOT NULL DEFAULT '' COMMENT '公众号 openid' AFTER `weixin_openid`" },
      { name: 'official_nickname', sql: "`official_nickname` varchar(100) NOT NULL DEFAULT '' COMMENT '公众号昵称' AFTER `official_openid`" },
      { name: 'official_avatar', sql: "`official_avatar` varchar(255) NOT NULL DEFAULT '' COMMENT '公众号头像' AFTER `official_nickname`" },
      { name: 'official_bind_time', sql: "`official_bind_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '公众号绑定时间' AFTER `official_avatar`" }
    ];

    for (const field of fields) {
      const exists = await this.query(`SHOW COLUMNS FROM ${userTable} LIKE '${field.name}'`);
      if (think.isEmpty(exists)) {
        await this.execute(`ALTER TABLE ${userTable} ADD COLUMN ${field.sql}`);
      }
    }

    const indexes = await this.query(`SHOW INDEX FROM ${userTable} WHERE Key_name = 'idx_official_openid'`);
    if (think.isEmpty(indexes)) {
      await this.execute(`ALTER TABLE ${userTable} ADD INDEX \`idx_official_openid\` (\`official_openid\`)`);
    }
  }

  async findOrCreateOfficialUser(openid) {
    await this.ensureOfficialSchema();
    await this.ensureAccountSchema();

    let userId = await this.where({ official_openid: openid }).getField('id', true);
    if (!think.isEmpty(userId)) {
      return userId;
    }

    const now = parseInt(Date.now() / 1000);
    const username = 'wx_' + String(openid).replace(/[^a-zA-Z0-9]/g, '').slice(-24);
    userId = await this.add({
      username: username,
      password: '',
      register_time: now,
      register_ip: '',
      last_login_time: now,
      last_login_ip: '',
      mobile: '',
      weixin_openid: '',
      official_openid: openid,
      official_nickname: '公众号用户',
      official_avatar: '',
      official_bind_time: now,
      avatar: '',
      gender: 0,
      birthday: 0,
      user_level_id: 0,
      nickname: '公众号用户',
      balance: 0
    });

    return userId;
  }

  normalizeAmount(value) {
    const amount = Math.round(parseFloat(value) * 100) / 100;
    if (!Number.isFinite(amount)) {
      return 0;
    }
    return amount;
  }

  async getBalance(userId) {
    await this.ensureAccountSchema();
    const balance = await this.where({ id: parseInt(userId) }).getField('balance', true);
    return this.normalizeAmount(balance || 0);
  }

  async addAccountLog(userId, type, amount, balanceAfter, orderId, remark) {
    const logTable = this.getAccountLogTable();
    const safeRemark = String(remark || '').replace(/'/g, "''");
    await this.execute(`INSERT INTO ${logTable}
      (\`user_id\`, \`type\`, \`amount\`, \`balance_after\`, \`order_id\`, \`remark\`, \`add_time\`)
      VALUES (${parseInt(userId)}, '${type}', ${this.normalizeAmount(amount).toFixed(2)}, ${this.normalizeAmount(balanceAfter).toFixed(2)}, ${parseInt(orderId || 0)}, '${safeRemark}', ${parseInt(Date.now() / 1000)})`);
  }

  async recharge(userId, amount, remark) {
    await this.ensureAccountSchema();
    const rechargeAmount = this.normalizeAmount(amount);
    if (rechargeAmount <= 0) {
      return null;
    }

    await this.execute(`UPDATE ${this.getUserTable()} SET \`balance\` = \`balance\` + ${rechargeAmount.toFixed(2)} WHERE \`id\` = ${parseInt(userId)}`);
    const balance = await this.getBalance(userId);
    await this.addAccountLog(userId, 'recharge', rechargeAmount, balance, 0, remark || '账户充值');
    return balance;
  }

  async payByBalance(userId, orderId, amount) {
    await this.ensureAccountSchema();
    const payAmount = this.normalizeAmount(amount);
    if (payAmount <= 0) {
      return { success: false, balance: await this.getBalance(userId) };
    }

    const affectedRows = await this.execute(`UPDATE ${this.getUserTable()}
      SET \`balance\` = \`balance\` - ${payAmount.toFixed(2)}
      WHERE \`id\` = ${parseInt(userId)} AND \`balance\` >= ${payAmount.toFixed(2)}`);

    const balance = await this.getBalance(userId);
    if (!affectedRows) {
      return { success: false, balance: balance };
    }

    await this.addAccountLog(userId, 'pay', -payAmount, balance, orderId, '订单余额支付');
    return { success: true, balance: balance };
  }
};
