var a1001 = {

    glCompressedTexImage2D: function(target, level, internalFormat, width, height, border, imageSize, data) {

        var lastTid = window._lastTextureId;
        var isMiniProgram = typeof wx !== 'undefined';

        function getMatchId() {
            var webgl1c = internalFormat == 36196;
            if (isMiniProgram && GameGlobal.USED_TEXTURE_COMPRESSION && webgl1c) {
                var length = HEAPU8.subarray(data, data + 1)[0];
                var d = HEAPU8.subarray(data + 1, data + 1 + length);
                var res = [];
                d.forEach(function(v) {
                    res.push(String.fromCharCode(v));
                });
                var matchId = res.join('');
                var start1 = res.length - 5;
                var start0 = res.length - 8;
                if (res[start0] == '_') {
                    start0++;
                    var header = ['a', 's', 't', 'c'];
                    for (var i = 0; i < header.length; i++) {
                        if (res[start0 + i] != header[i]) {
                            return [matchId, '8x8', false];
                        }
                    }
                    start0--;
                    var astcBlockSize = matchId.substring(start0 + 5);
                    return [matchId.substr(0, start0), astcBlockSize, false];
                } else if (res[start1] == '_') {
                    start1++;
                    var size = res[start1++];
                    if (size != '4' && size != '5' && size != '6' && size != '8') {
                        return [matchId, '8x8', false];
                    }
                    var astcBlockSize = size + 'x' + size;
                    var limit = res[start1];
                    var limitType = false;
                    if (limit != '#') {
                        limitType = true;
                    }
                    start1 -= 2;
                    return [matchId.substr(0, start1), astcBlockSize, limitType];
                } else {
                    return [matchId, '8x8', false];
                }
            }
            return [-1, '8x8', false];
        }

        var matchIdInfo = getMatchId();
        var matchId = matchIdInfo[0];
        var astcBlockSize = matchIdInfo[1];
        var limitType = matchIdInfo[2];

        function compressedImage2D(rawData) {
            var format = 0;
            var dataOffset = 16;
            var compressFormat = limitType ? GameGlobal.NoneLimitSupportedTexture : GameGlobal.TextureCompressedFormat;
            switch (compressFormat) {
                case "astc":
                    var astcList = GLctx.getExtension("WEBGL_compressed_texture_astc");
                    if (astcBlockSize == '4x4') {
                        format = astcList.COMPRESSED_RGBA_ASTC_4x4_KHR;
                        break;
                    }
                    if (astcBlockSize == '5x5') {
                        format = astcList.COMPRESSED_RGBA_ASTC_5x5_KHR;
                        break;
                    }
                    if (astcBlockSize == '6x6') {
                        format = 0x93B4;
                        break;
                    }
                    format = astcList.COMPRESSED_RGBA_ASTC_8x8_KHR;
                    break;
                case "etc2":
                    format = GLctx.getExtension("WEBGL_compressed_texture_etc").COMPRESSED_RGBA8_ETC2_EAC;
                    break;
                case "dds":
                    format = GLctx.getExtension("WEBGL_compressed_texture_s3tc").COMPRESSED_RGBA_S3TC_DXT5_EXT;
                    dataOffset = 128;
                    break;
                case "pvr":
                    format = GLctx.getExtension("WEBGL_compressed_texture_pvrtc").COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
                    var PVR_HEADER_METADATA = 12;
                    var PVR_HEADER_LENGTH = 13; // The header length in 32 bit ints.
                    var header = new Int32Array(rawData, 0, PVR_HEADER_LENGTH);
                    dataOffset = header[PVR_HEADER_METADATA] + 52;
                    break;
                case "etc1":
                    format = GLctx.getExtension("WEBGL_compressed_texture_etc1").COMPRESSED_RGB_ETC1_WEBGL;
                    break
            }
            GLctx["compressedTexImage2D"](target, level, format, width, height, border, new Uint8Array(rawData, dataOffset))
        }

        function texImage2D(image) {
            GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, image)
        }

        function renderTexture(id) {
            if (!GL.textures[lastTid]) {
                return;
            }
            var PotList = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
            var _data = GameGlobal.DownloadedTextures[id].data;
            var tid = lastTid;
            if (!GL.textures[tid]) {
                return;
            }
            GLctx.bindTexture(GLctx.TEXTURE_2D, GL.textures[tid]);

            if (limitType && !GameGlobal.NoneLimitSupportedTexture) {
                texImage2D(_data);
            } else if (!GameGlobal.TextureCompressedFormat) {
                texImage2D(_data);
            } else if (GameGlobal.TextureCompressedFormat == "pvr" && (width !== height || PotList.indexOf(height) == -1)) {
                texImage2D(_data);
            } else if (GameGlobal.TextureCompressedFormat == 'dds' && (height % 4 !== 0 || width % 4 !== 0)) {
                texImage2D(_data);
            } else {
                compressedImage2D(_data);
            }
            GLctx.bindTexture(GLctx.TEXTURE_2D, window._lastBoundTexture ? GL.textures[window._lastBoundTexture] : null);

        }

        function renderTransparent() {
            GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, 1, 1, 0, GLctx.RGBA, GLctx.UNSIGNED_SHORT_4_4_4_4, new Uint16Array([0, 0]))
        }

        if (matchId != -1) {
            if (GameGlobal.DownloadedTextures[matchId] && GameGlobal.DownloadedTextures[matchId].data) {
                renderTexture(matchId)
            } else {
                renderTransparent();
                window.WXWASMSDK.WXDownloadTexture(matchId, width, height, (function() {
                    renderTexture(matchId)
                }), limitType)
            }
            return
        }
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, HEAPU8, data, imageSize);
            return
        }
        GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, data ? HEAPU8.subarray(data, data + imageSize) : null)
    },
    glCompressedTexSubImage2D: function(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
        var lastTid = window._lastTextureId;
        var isMiniProgram = typeof wx !== 'undefined';

        function getMatchId() {
            var webgl1c = format == 36196;
            if (isMiniProgram && GameGlobal.USED_TEXTURE_COMPRESSION && webgl1c) {
                var length = HEAPU8.subarray(data, data + 1)[0];
                var d = HEAPU8.subarray(data + 1, data + 1 + length);
                var res = [];
                d.forEach(function(v) {
                    res.push(String.fromCharCode(v));
                });
                var matchId = res.join('');
                var start0 = res.length - 8;
                var start1 = res.length - 5;
                if (res[start0] == '_') {
                    start0++;
                    var header = ['a', 's', 't', 'c'];
                    for (var i = 0; i < header.length; i++) {
                        if (res[start0 + i] != header[i]) {
                            return [matchId, '8x8', false];
                        }
                    }
                    start0--;
                    var astcBlockSize = matchId.substring(start0 + 5);
                    return [matchId.substr(0, start0), astcBlockSize, false];
                } else if (res[start1] == '_') {
                    start1++;
                    var size = res[start1++];
                    if (size != '4' && size != '5' && size != '6' && size != '8') {
                        return [matchId, '8x8', false];
                    }
                    var astcBlockSize = size + 'x' + size;
                    var limit = res[start1];
                    var limitType = false;
                    if (limit != '#') {
                        limitType = true;
                    }
                    start1 -= 2;
                    return [matchId.substr(0, start1), astcBlockSize, limitType];
                } else {
                    return [matchId, '8x8', false];
                }
            }
            return [-1, '8x8', false];
        }

        var matchIdInfo = getMatchId();
        var matchId = matchIdInfo[0];
        var astcBlockSize = matchIdInfo[1];
        var limitType = matchIdInfo[2];

        function compressedImage2D(rawData) {
            var format = 0;
            var dataOffset = 16;
            var compressFormat = limitType ? GameGlobal.NoneLimitSupportedTexture : GameGlobal.TextureCompressedFormat;
            switch (compressFormat) {
                case "astc":
                    var astcList = GLctx.getExtension("WEBGL_compressed_texture_astc");
                    if (astcBlockSize == '4x4') {
                        format = astcList.COMPRESSED_RGBA_ASTC_4x4_KHR;
                        break;
                    }
                    if (astcBlockSize == '5x5') {
                        format = astcList.COMPRESSED_RGBA_ASTC_5x5_KHR;
                        break;
                    }
                    if (astcBlockSize == '6x6') {
                        format = 0x93B4;
                        break;
                    }
                    format = astcList.COMPRESSED_RGBA_ASTC_8x8_KHR;
                    break;
                case "etc2":
                    format = GLctx.getExtension("WEBGL_compressed_texture_etc").COMPRESSED_RGBA8_ETC2_EAC;
                    break;
                case "dds":
                    format = GLctx.getExtension("WEBGL_compressed_texture_s3tc").COMPRESSED_RGBA_S3TC_DXT5_EXT;
                    dataOffset = 128;
                    break;
                case "pvr":
                    format = GLctx.getExtension("WEBGL_compressed_texture_pvrtc").COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
                    var PVR_HEADER_METADATA = 12;
                    var PVR_HEADER_LENGTH = 13; // The header length in 32 bit ints.
                    var header = new Int32Array(rawData, 0, PVR_HEADER_LENGTH);
                    dataOffset = header[PVR_HEADER_METADATA] + 52;
                    break;
                case "etc1":
                    format = GLctx.getExtension("WEBGL_compressed_texture_etc1").COMPRESSED_RGB_ETC1_WEBGL;
                    break
            }
            GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, new Uint8Array(rawData, dataOffset))
        }

        function texImage2D(image) {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, GLctx.RGBA, GLctx.UNSIGNED_BYTE, image)
        }

        function renderTexture(id) {
            if (!GL.textures[lastTid]) {
                return;
            }
            var _data = GameGlobal.DownloadedTextures[id].data;
            var tid = lastTid;
            if (!GL.textures[tid]) {
                return;
            }
            GLctx.bindTexture(GLctx.TEXTURE_2D, GL.textures[tid]);

            if (limitType && !GameGlobal.NoneLimitSupportedTexture) {
                texImage2D(_data);
            } else if (!GameGlobal.TextureCompressedFormat) {
                texImage2D(_data);
            } else if (GameGlobal.TextureCompressedFormat == "pvr" && (width !== height || PotList.indexOf(height) == -1)) {
                texImage2D(_data);
            } else if (GameGlobal.TextureCompressedFormat == 'dds' && (height % 4 !== 0 || width % 4 !== 0)) {
                texImage2D(_data);
            } else {
                compressedImage2D(_data);
            }


            GLctx.bindTexture(GLctx.TEXTURE_2D, window._lastBoundTexture ? GL.textures[window._lastBoundTexture] : null);

        }

        var p = window._lastTexStorage2DParams;
        if (matchId != -1) {
            var f = GLctx.RGBA8;
            switch (GameGlobal.TextureCompressedFormat) {
                case "astc":
                    var astcList = GLctx.getExtension("WEBGL_compressed_texture_astc");
                    if (astcBlockSize == '4x4') {
                        f = astcList.COMPRESSED_RGBA_ASTC_4x4_KHR;
                        break;
                    }
                    if (astcBlockSize == '5x5') {
                        f = astcList.COMPRESSED_RGBA_ASTC_5x5_KHR;
                        break;
                    }
                    if (astcBlockSize == '6x6') {
                        f = 0x93B4;
                        break;
                    }
                    f = astcList.COMPRESSED_RGBA_ASTC_8x8_KHR;
                    break;
                case "etc2":
                    f = GLctx.getExtension("WEBGL_compressed_texture_etc").COMPRESSED_RGBA8_ETC2_EAC;
                    break;
                case "dds":
                    f = GLctx.getExtension("WEBGL_compressed_texture_s3tc").COMPRESSED_RGBA_S3TC_DXT5_EXT;
                    break;
                case "pvr":
                    f = GLctx.getExtension("WEBGL_compressed_texture_pvrtc").COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
                    break;
            }
            GLctx["texStorage2D"](p[0], p[1], f, width, height);
            if (GameGlobal.DownloadedTextures[matchId] && GameGlobal.DownloadedTextures[matchId].data) {
                renderTexture(matchId)
            } else {
                window.WXWASMSDK.WXDownloadTexture(matchId, width, height, (function() {
                    renderTexture(matchId)
                }), limitType)
            }
            return
        }
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, HEAPU8, data, imageSize);
            return
        }
        GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, data ? HEAPU8.subarray(data, data + imageSize) : null)
    },


    $WXFS: {},

  WXFSInit: function (ttl, capacity) {
    function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }
    function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
    function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
    function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
    function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
    var WXMap = /*#__PURE__*/function () {
      function WXMap(hash, rename) {
        _classCallCheck(this, WXMap);
        this.hash = hash;
        this.rename = rename;
        this.size = 0;
      }
      _createClass(WXMap, [{
        key: "get",
        value: function get(key) {
          return this.hash.get(this.rename(key));
        }
      }, {
        key: "set",
        value: function set(key, value) {
          this.delete(key);
          this.size += value;
          return this.hash.set(this.rename(key), value);
        }
      }, {
        key: "has",
        value: function has(key) {
          return this.hash.has(this.rename(key));
        }
      }, {
        key: "delete",
        value: function _delete(key) {
          this.size -= this.hash.get(this.rename(key))|0;
          return this.hash.delete(this.rename(key));
        }
      }]);
      return WXMap;
    }();
    WXFS.WXABErrorSteps = {
      "kWebRequestResponse": 0,
      "kLoadBundleFromFile": 1,
      "kCacheGet" : 2
    };
    WXFS.disk = new WXMap(unityNamespace.WXAssetBundles,unityNamespace.PathInFileOS);
    WXFS.msg = "";
    WXFS.fd2wxStream = new Map;
    WXFS.path2fd = new Map;
    WXFS.fs = wx.getFileSystemManager();
    WXFS.nowfd = FS.MAX_OPEN_FDS + 1;
    WXFS.isWXAssetBundle = function(url){
      if(url.startsWith(GameGlobal.unityNamespace.DATA_CDN)||url.startsWith('/vfs_streamingassets')){
        return unityNamespace.isWXAssetBundle(WXFS.url2path(url));
      }
      return unityNamespace.isWXAssetBundle(url);
    }
    WXFS.newfd = function(){
      return WXFS.nowfd++;
    }
    WXFS.doWXAccess = function(path, amode){
      if (amode & ~7) {
        return -28;
      }
      try{
        WXFS.fs.accessSync(path);
      } catch(e){
        return -44;
      }
      return 0
    }
    
    var WXFileCache = /*#__PURE__*/function () {
      function WXFileCache(ttl, capacity) {
        _classCallCheck(this, WXFileCache);
        this.ttl = ttl;
        if (capacity > 0) this.capacity = capacity;
        this.hash = new Map();
        this.size = 0;
        this.maxSize = 0;
        this.obsolete = "";
      }
      // record obsolete file path when file not found
      _createClass(WXFileCache, [{
        key: "record",
        value: function record(path) {
          if (!this.obsolete.includes(path)) {
            if (this.obsolete != "") this.obsolete += ";";
            this.obsolete += path;
          }
        }
      }, {
        key: "get",
        value: function get(key) {
          var temp = this.hash.get(key);
          if (temp !== undefined) {
            if(temp.cleanable && unityNamespace.isAndroid && temp.time + this.ttl * 1000 < Date.now()){
              try {
                var check_path = WXFS.fd2wxStream.get(key).path
                if(!GameGlobal.manager.getCachePath(check_path)){
                  throw new Error("No such file in the wx cache system")
                }
                WXFS.fs.statSync(check_path)
              } catch (e) {
                GameGlobal.manager.reporter.wxAssetBundle.reportEmptyContent({stage: WXFS.WXABErrorSteps['kCacheGet'], path: check_path, error: !!e ? e.toString() : 'unknown'});
                GameGlobal.manager.Logger.pluginLog('[WXAssetBundle]Android statSync path: ' + check_path + ' error: ' + (!!e ? e.toString() : 'unknown'));
              }
            }
            this.hash.delete(key);
            temp.time = Date.now();
            this.hash.set(key, temp);
            return temp.ab;
          }
          return -1;
        }
      }, {
        key: "put",
        value: function put(key, ab, cleanable) {
          if(!ab)return;
          cleanable = cleanable != undefined ? cleanable : true;
          var value = {
            ab: ab,
            time: Date.now(),
            cleanable: cleanable
          };
          var temp = this.hash.get(key);
          if (temp !== undefined) {
            this.size -= temp.ab.byteLength;
            this.hash.delete(key);
            this.hash.set(key, value);
          } else {
            if (this.capacity !== undefined && this.size >= this.capacity) {
              var idx = this.hash.keys().next().value;
              this.size -= idx.ab.byteLength;
              this.hash.delete(idx);
              this.hash.set(key, value);
            } else {
              this.hash.set(key, value);
            }
          }
          this.size += value.ab.byteLength;
          this.maxSize = Math.max(this.size, this.maxSize);
        }
      }, {
        key: "cleanable",
        value: function cleanable(key, _cleanable) {
          _cleanable = _cleanable != undefined ? _cleanable : true;
          var temp = this.hash.get(key);
          if (temp !== undefined) {
            // this.hash.delete(key);
            // temp.time = Date.now();
            temp.cleanable = _cleanable;
            this.hash.set(key, temp);
            return 0;
          } else {
            return -1;
          }
        }
      }, {
        key: "cleanbytime",
        value: function cleanbytime(deadline) {
          var iter = this.hash.keys(),
            key,
            value;
          while ((key = iter.next().value) != undefined && (value = this.hash.get(key)).time < deadline) {
            if (value.cleanable) {
              this.size -= value.ab.byteLength;
              this.hash.delete(key);
            }
          }
        }
      }, {
        key: "RegularCleaning",
        value: function RegularCleaning(kIntervalSecond) {
          var _this = this;
          setInterval(function () {
            _this.cleanbytime(Date.now() - _this.ttl * 1000);
          }, kIntervalSecond * 1000);
        }
      }, {
        key: "delete",
        value: function _delete(key) {
            this.size -= this.hash.get(key).ab.byteLength;
            return this.hash.delete(key)
        }
      }, {
        key: "has",
        value: function _has(key) {
            return this.hash.has(key)
        }
      }
      ]);
      return WXFileCache;
    }();
    
    WXFS.cache = new WXFileCache(ttl, capacity);
    if(!unityNamespace.isAndroid) {
      WXFS.cache.RegularCleaning(1);
    }

    WXFS.wxstat = function(path){
      try {
        var fd = WXFS.path2fd.get(path)
        if (fd !== undefined){
          var stat = {
            mode: 33206,
            size: WXFS.cache.get(fd).byteLength,
            dev: 1,
            ino: 1,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: 0,
            atime: new Date(),
            mtime: new Date(0),
            ctime: new Date(),
            blksize: 4096
          }
          stat.blocks = Math.ceil(stat.size / stat.blksize);
          return stat;
        }
        var stat = WXFS.fs.statSync(path);
        // something not in wx.FileSystemManager, just fill in 0/1
        stat.dev = 1;
        stat.ino = 1;
        stat.nlink = 1;
        stat.uid = 0;
        stat.gid = 0;
        stat.rdev = 0;
        stat.atime = new Date(stat.lastAccessedTime * 1000);
        stat.mtime = new Date(0); // if update modified time, wasm will log error "Archive file was modified when opened"
        stat.ctime = new Date(stat.lastModifiedTime * 1000); // time of permission modification, just use mtime to instand
        delete stat.lastAccessedTime;
        delete stat.lastModifiedTime;
        stat.blksize = 4096;
        stat.blocks = Math.ceil(stat.size / stat.blksize);
        return stat;
      } catch (e){
        console.error(e)
        throw e;
      }
    }
    WXFS._url2path = new Map();
    WXFS.url2path = function(url) {
      if(WXFS._url2path.has(url)){
        return WXFS._url2path.get(url);
      }
      if(url.startsWith('/vfs_streamingassets/')){
        var path = url.replace('/vfs_streamingassets/', wx.env.USER_DATA_PATH + "/__GAME_FILE_CACHE/StreamingAssets/");
      }
      else{
        var path = url.replace(GameGlobal.unityNamespace.DATA_CDN, wx.env.USER_DATA_PATH+'/__GAME_FILE_CACHE/');
      }
      if(path.indexOf('?') > -1){
        path = path.substring(0,path.indexOf("?"));
      }
      WXFS._url2path.set(url, path);
      return path;
    };
    WXFS.LoadBundleFromFile = function(path){
      try {
        var res = WXFS.fs.readFileSync(path);
      } catch(e) {
        var err_msg = !!e ? e.toString() : 'unknown';
      }
      var expected_size = WXFS.disk.get(path);
      if(!res || res.byteLength != expected_size){
        var wxab_error = {
          stage: WXFS.WXABErrorSteps['kLoadBundleFromFile'],
          path: path,
          size: (!!res ? res.byteLength : 0),
          expected_size: expected_size,
          error: err_msg
        };
        GameGlobal.manager.reporter.wxAssetBundle.reportEmptyContent(wxab_error);
        GameGlobal.manager.Logger.pluginLog('[WXAssetBundle]readFileSync at path ' + path + ' return size ' + (!!res?res.byteLength:0) + ', different from expected size ' + expected_size + ' error: ' + err_msg);
        wx.setStorageSync("wxfs_unserviceable",true);
        GameGlobal.onCrash();
        return "";
      }
      return res;
    };
    WXFS.read = function(stream, buffer, offset, length, position){
      var contents = WXFS.cache.get(stream.fd);
      if (contents === -1) {
        var res = WXFS.LoadBundleFromFile(stream.path);
        WXFS.cache.put(stream.fd, res);
        contents = res;
      }
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      assert(size >= 0);
      buffer.set(new Uint8Array(contents.slice(position, position + size)), offset);
      return size;
    };
  },

  GetObsoleteFilePath: function () {
    var bufferSize = lengthBytesUTF8(WXFS.cache.obsolete) + 1;
    var buffer = _malloc(bufferSize);
    stringToUTF8(WXFS.cache.obsolete, buffer, bufferSize);
    WXFS.cache.obsolete = "";
    return buffer;
  },

  UnCleanbyPath: function (ptr) {
    var url = UTF8ToString(ptr);
    var path = WXFS.url2path(url);
    if(!WXFS.disk.has(path)){
      WXFS.disk.set(path, 0);
    }
  },

  UnloadbyPath: function (ptr) {
    var path = WXFS.url2path(UTF8ToString(ptr));
    var fd = WXFS.path2fd.get(path);
    if(WXFS.cache.has(fd)){
      WXFS.cache.delete(fd);
    }
    if(WXFS.disk.has(path)){
      WXFS.disk.delete(path);
    }
  },

  CheckWXFSReady: function () {
    return WXFS.fs!==undefined;
  },

  WXGetBundleFromXML: function(url, id, callback, needRetry){
    needRetry = needRetry?needRetry:true;
    var _url = UTF8ToString(url);
    var _id = UTF8ToString(id);
    var len = lengthBytesUTF8(_id) + 1;
    var idPtr = _malloc(len);
    stringToUTF8(_id, idPtr, len);
    var xhr = new GameGlobal.unityNamespace.UnityLoader.UnityCache.XMLHttpRequest;
    xhr.open('GET', _url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function (e) {
      if (xhr.status >= 400 && needRetry) {
        setTimeout(function () {
          _WXGetBundleFromXML(url, false);
        }, 1000);
        xhr=null;
        return false;
      }
      if (callback) {
        var kWebRequestOK = 0;
        var kNoResponseBuffer = 1111;
        var xhrByteArray = new Uint8Array(xhr.response);
        if (xhrByteArray.length != 0) {
          var arrayBuffer = xhr.response;
          var path = WXFS.url2path(_url);
          var numberfd = WXFS.path2fd.get(path);
          if (numberfd == undefined) {
            numberfd = WXFS.newfd();
            WXFS.path2fd.set(path, numberfd);
          }
          var wxStream = WXFS.fd2wxStream.get(numberfd);
          if (wxStream == undefined) {
            wxStream = {
              fd: numberfd,
              path: path,
              seekable: true,
              position: 0,
              stream_ops: MEMFS.stream_ops,
              ungotten: [],
              node:{mode:32768,usedBytes:xhrByteArray.length},
              error: false
            };
            wxStream.stream_ops.read = WXFS.read;
            WXFS.fd2wxStream.set(numberfd, wxStream);
          }
          WXFS.cache.put(numberfd, arrayBuffer, xhr.isReadFromCache);
          WXFS.disk.set(path, xhrByteArray.length);
          dynCall("viii", callback, [idPtr, kWebRequestOK, 0]);
          if(xhr.isReadFromCache){
            _free(idPtr);
          }
        } else {
          dynCall('viii', callback, [idPtr, kNoResponseBuffer, 0]);
          _free(idPtr);
        }
      }
    };
    xhr.onsave = function xhr_onsave(e){
      WXFS.cache.cleanable(WXFS.path2fd.get(e));
      _free(idPtr);
    }
    function XHRHandleError(err, code) {
      if (needRetry) {
        return setTimeout(function () {
          _WXGetBundleFromXML(url, false);
        }, 1e3);
      }
      if (callback) {
        var len = lengthBytesUTF8(err) + 1;
        var buffer = _malloc(len);
        stringToUTF8(err, buffer, len);
        dynCall("viii", callback, [idPtr, code, buffer]);
        _free(buffer);
        _free(idPtr);
      }
    }
    xhr.onerror = function xhr_onerror(e) {
      var kWebErrorUnknown = 2;
      XHRHandleError("Unknown error.", kWebErrorUnknown);
    };
    xhr.ontimeout = function xhr_onerror(e) {
      var kWebErrorTimeout = 14;
      XHRHandleError("Connection timed out.", kWebErrorTimeout);
    };
    xhr.onabort = function xhr_onerror(e) {
      var kWebErrorAborted = 17;
      XHRHandleError("Aborted.", kWebErrorAborted);
    }
    xhr.send();
  },

  WXGetBundleNumberInMemory: function () { 
    return WXFS&&WXFS.cache&&WXFS.cache.hash&&WXFS.cache.hash.size; 
  },
  WXGetBundleNumberOnDisk: function () { 
    return WXFS&&WXFS.disk&&WXFS.disk.hash&&WXFS.disk.hash.size; 
  },
  WXGetBundleSizeInMemory: function () { 
    return WXFS&&WXFS.cache&&WXFS.cache.size; 
  },
  WXGetBundleSizeOnDisk: function () { 
    return WXFS&&WXFS.disk&&WXFS.disk.size; 
  }
};
mergeInto(LibraryManager.library, a1001);
