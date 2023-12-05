import { formatTouchEvent } from "../utils";
let OnTouchMoveList;
function touchesToByteArray(touches) {
    const byteArray = new Uint8Array(touches.length * (5 * 4 + 8));
    let offset = 0;
    touches.forEach(touch => {
        byteArray.set(new Uint8Array(new Float32Array([touch.clientX]).buffer), offset);
        offset += 4;
        byteArray.set(new Uint8Array(new Float32Array([touch.clientY]).buffer), offset);
        offset += 4;
        byteArray.set(new Uint8Array(new Float64Array([touch.force]).buffer), offset);
        offset += 8;
        byteArray.set(new Uint8Array(new Uint32Array([touch.identifier]).buffer), offset);
        offset += 4;
        byteArray.set(new Uint8Array(new Float32Array([touch.pageX]).buffer), offset);
        offset += 4;
        byteArray.set(new Uint8Array(new Float32Array([touch.pageY]).buffer), offset);
        offset += 4;
    });
    return byteArray;
}
function serializeOnTouchStartListenerResult(result) {
    const touchesByteArray = touchesToByteArray(result.touches);
    const changedTouchesByteArray = touchesToByteArray(result.changedTouches);
    
    const timeStampBigInt = BigInt(result.timeStamp); 
    const timeStampByteArray = new Uint8Array(new BigUint64Array([timeStampBigInt]).buffer); 
    const dataBuffer = new Uint8Array(touchesByteArray.length + changedTouchesByteArray.length + timeStampByteArray.length);
    dataBuffer.set(touchesByteArray, 0);
    dataBuffer.set(changedTouchesByteArray, touchesByteArray.length);
    dataBuffer.set(timeStampByteArray, touchesByteArray.length + changedTouchesByteArray.length);
    return dataBuffer;
}
function WX_OnTouchMove() {
    if (!OnTouchMoveList) {
        OnTouchMoveList = [];
    }
    const callback = (res) => {
        res.touches = res.touches.map((v) => formatTouchEvent(v));
        res.changedTouches = res.changedTouches.map((v) => formatTouchEvent(v));
        res.timeStamp = parseInt(res.timeStamp.toString(), 10);
        
        const serializedData = serializeOnTouchStartListenerResult(res);
        const buffer = GameGlobal.Module._malloc(serializedData.length);
        GameGlobal.Module.HEAPU8.set(serializedData, buffer);
        
        GameGlobal.Module.dynCall_viiii(GameGlobal.Module.WXTouchManager.onTouchMove, buffer, serializedData.length, res.touches.length, res.changedTouches.length);
        GameGlobal.Module._free(buffer);
    };
    OnTouchMoveList.push(callback);
    wx.onTouchMove(callback);
}
function WX_OffTouchMove() {
    (OnTouchMoveList || []).forEach((v) => {
        wx.offTouchMove(v);
    });
}
export default {
    WX_OnTouchMove,
    WX_OffTouchMove,
};
