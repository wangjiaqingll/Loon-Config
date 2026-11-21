/*
 * 上汽大众超级App - 签到凭据捕获脚本（Loon http-request）
 *
 * 用法：
 *   1. 导入配置并启用 MITM（hostname 需包含 mweb.mos.csvw.com）后，
 *      打开上汽大众 App → 「签到」页面，让 App 发出一次签到相关请求。
 *   2. 本脚本会拦截该请求，把完整请求头 + userId/idpId 存入 Loon 持久化存储，
 *      并弹出通知「凭据捕获成功」。
 *   3. 之后 cron 脚本（svw-checkin.js）即可用这份凭据每天自动签到。
 *
 * 注意：凭据过期时重新执行一次第 1 步即可。
 */

const KEY = 'SVW_CHECKIN_DATA';

// 从 URL 提取查询参数
function getQuery(u, k) {
  const m = u.match(new RegExp('[?&]' + k + '=([^&#]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

const url = $request.url;
const headers = $request.headers || {};
const userId = getQuery(url, 'userId');
const idpId = getQuery(url, 'idpId');

const data = {
  infoUrl: url,
  headers: headers,
  userId: userId,
  idpId: idpId,
  savedAt: new Date().toLocaleString()
};

$persistentStore.write(JSON.stringify(data), KEY);

console.log('[SVW签到] 捕获请求: ' + url);
console.log('[SVW签到] 请求头: ' + JSON.stringify(headers, null, 2));

$notification.post(
  '上汽大众签到',
  '✅ 凭据捕获成功',
  (userId || idpId)
    ? 'userId=' + userId + '\nidpId=' + idpId + '\n已保存，等待定时签到'
    : '已保存请求头（未在 URL 中找到 userId/idpId，请查看 Loon 日志确认）'
);

$done({});
