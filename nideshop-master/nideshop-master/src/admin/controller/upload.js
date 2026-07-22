const Base = require('./base.js');
const fs = require('fs');

module.exports = class extends Base {
  getOrigin() {
    return this.ctx.origin || `${this.ctx.protocol || 'http'}://${this.ctx.host || '127.0.0.1:8360'}`;
  }

  detectImageExt(filePath) {
    const buffer = fs.readFileSync(filePath);
    const ascii = buffer.slice(0, 16).toString('ascii');

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return '.jpg';
    }
    if (buffer[0] === 0x89 && ascii.indexOf('PNG') === 1) {
      return '.png';
    }
    if (ascii.indexOf('GIF8') === 0) {
      return '.gif';
    }
    if (ascii.indexOf('RIFF') === 0 && ascii.indexOf('WEBP') === 8) {
      return '.webp';
    }

    return null;
  }

  saveImage(file, folder) {
    if (think.isEmpty(file)) {
      return null;
    }

    const safeExt = this.detectImageExt(file.path);
    if (!safeExt) {
      fs.unlinkSync(file.path);
      throw new Error('Unsupported image format. Please upload a real JPG, PNG, GIF, or WebP image.');
    }

    const uploadDir = think.ROOT_PATH + '/www/static/upload/' + folder;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {recursive: true});
    }

    const filename = '/static/upload/' + folder + '/' + think.uuid(32) + safeExt;
    fs.copyFileSync(file.path, think.ROOT_PATH + '/www' + filename);
    fs.unlinkSync(file.path);
    return filename;
  }

  async goodsPicAction() {
    const imageFile = this.file('goods_pic') || this.file('file');
    let fileUrl = null;

    try {
      fileUrl = this.saveImage(imageFile, 'goods');
    } catch (err) {
      return this.fail(err.message || 'Unsupported image format');
    }
    if (!fileUrl) {
      return this.fail('保存失败');
    }

    return this.success({
      name: this.post('field') || 'goods_pic',
      fileUrl: fileUrl
    });
  }

  async brandPicAction() {
    const brandFile = this.file('brand_pic');
    if (think.isEmpty(brandFile)) {
      return this.fail('保存失败');
    }
    const that = this;
    const filename = '/static/upload/brand/' + think.uuid(32) + '.jpg';
    const is = fs.createReadStream(brandFile.path);
    const os = fs.createWriteStream(think.ROOT_PATH + '/www' + filename);
    is.pipe(os);

    return that.success({
      name: 'brand_pic',
      fileUrl: 'http://127.0.0.1:8360' + filename
    });
  }

  async brandNewPicAction() {
    const brandFile = this.file('brand_new_pic');
    if (think.isEmpty(brandFile)) {
      return this.fail('保存失败');
    }
    const that = this;
    const filename = '/static/upload/brand/' + think.uuid(32) + '.jpg';

    const is = fs.createReadStream(brandFile.path);
    const os = fs.createWriteStream(think.ROOT_PATH + '/www' + filename);
    is.pipe(os);

    return that.success({
      name: 'brand_new_pic',
      fileUrl: 'http://127.0.0.1:8360' + filename
    });
  }

  async categoryWapBannerPicAction() {
    const imageFile = this.file('wap_banner_pic');
    if (think.isEmpty(imageFile)) {
      return this.fail('保存失败');
    }
    const that = this;
    const filename = '/static/upload/category/' + think.uuid(32) + '.jpg';

    const is = fs.createReadStream(imageFile.path);
    const os = fs.createWriteStream(think.ROOT_PATH + '/www' + filename);
    is.pipe(os);

    return that.success({
      name: 'wap_banner_url',
      fileUrl: 'http://127.0.0.1:8360' + filename
    });
  }

  async topicThumbAction() {
    const imageFile = this.file('scene_pic_url');
    if (think.isEmpty(imageFile)) {
      return this.fail('保存失败');
    }
    const that = this;
    const filename = '/static/upload/topic/' + think.uuid(32) + '.jpg';

    const is = fs.createReadStream(imageFile.path);
    const os = fs.createWriteStream(think.ROOT_PATH + '/www' + filename);
    is.pipe(os);

    return that.success({
      name: 'scene_pic_url',
      fileUrl: 'http://127.0.0.1:8360' + filename
    });
  }
};
