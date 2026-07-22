const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;
    const name = this.get('name') || '';

    const model = this.model('goods');
    const data = await model.where({name: ['like', `%${name}%`]}).order(['id DESC']).page(page, size).countSelect();

    return this.success(data);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('goods');
    const data = await model.where({id: id}).find();

    return this.success(data);
  }

  async syncDefaultProduct(goods) {
    if (think.isEmpty(goods) || !goods.id) {
      return;
    }

    const productModel = this.model('product');
    const specificationCount = await this.model('goods_specification').where({goods_id: goods.id}).count();
    if (specificationCount > 0) {
      return;
    }

    const productData = {
      goods_id: goods.id,
      goods_specification_ids: '',
      goods_sn: goods.goods_sn || String(goods.id),
      goods_number: Number(goods.goods_number || 0),
      retail_price: Number(goods.retail_price || 0)
    };

    const product = await productModel.where({
      goods_id: goods.id,
      goods_specification_ids: ''
    }).find();

    if (think.isEmpty(product)) {
      await productModel.add(productData);
    } else {
      await productModel.where({id: product.id}).update(productData);
    }
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }

    const values = this.post();
    const id = this.post('id');

    const model = this.model('goods');
    values.goods_unit = values.goods_unit || '件';
    values.primary_pic_url = values.primary_pic_url || '';
    values.list_pic_url = values.list_pic_url || '';
    values.promotion_desc = values.promotion_desc || '';
    values.promotion_tag = values.promotion_tag || '';
    values.app_exclusive_price = Number(values.app_exclusive_price || 0);
    values.is_app_exclusive = values.is_app_exclusive ? 1 : 0;
    values.is_limited = values.is_limited ? 1 : 0;
    values.is_on_sale = values.is_on_sale ? 1 : 0;
    values.is_new = values.is_new ? 1 : 0;
    values.is_hot = values.is_hot ? 1 : 0;
    if (id > 0) {
      await model.where({id: id}).update(values);
      values.id = Number(id);
    } else {
      const lastId = await model.order(['id DESC']).getField('id', true);
      values.id = Number(lastId || 1000000) + 1;
      values.add_time = values.add_time || parseInt(Date.now() / 1000);
      await model.add(values);
    }
    await this.syncDefaultProduct(values);
    return this.success(values);
  }

  async destoryAction() {
    const id = this.post('id');
    await this.model('goods').where({id: id}).limit(1).delete();
    // TODO 删除图片

    return this.success();
  }
};
