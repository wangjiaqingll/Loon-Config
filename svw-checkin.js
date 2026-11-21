/*
 * 上汽大众超级App - 每日自动签到（Loon cron）
 *
 * 依赖：先运行 svw-capture.js 捕获一次凭据（在 App 内打开签到页即可）。
 * 建议 cron：30 8 * * *（每天 08:30）
 *
 * 接口说明（参考社区公开脚本）：
 *   GET  https://mweb.mos.csvw.com/mos/operation/home/api/v1/user/sign/info
 *        ?type=task&activityId=MOS_SX_Sign_1001&brand=vw&userId=xxx&idpId=xxx
 *        → 返回 currentSignStatus（1=今日已签到）、signCount（连续天数）
 *   POST https://mweb.mos.csvw.com/mos/operation/home/api/v1/user/sign
 *        → code === '000000' 视为成功
 *
 * 如果 POST 返回接口/参数错误，说明官方端点有变化：
 *   在 App 内手动点一次「签到」，看 Loon 日志里捕获脚本打印的真实请求，
 *   把真实 POST 地址/请求体发我或自行替换下方 SIGN_URL / SIGN_BODY。
 */

const KEY = 'SVW_CHECKIN_DATA';
const ACTIVITY_ID = 'MOS_SX_Sign_1001';
const BRAND = 'vw';
const SIGN_URL = 'https://mweb.mos.csvw.com/mos/operation/home/api/v1/user/sign';

function notify(title, sub, body) {
  console.log('[SVW签到] ' + title + ' | ' + sub + ' | ' + body);
  $notification.post(title, sub, body);
}

function main() {
  const raw = $persistentStore.read(KEY);
  if (!raw) {
    notify('上汽大众签到', '❌ 缺少凭据', '请先在 App 内打开一次「签到」页面，让捕获脚本保存凭据');
    return $done();
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    notify('上汽大众签到', '❌ 凭据损坏', '请重新捕获（App 内打开签到页）');
    return $done();
  }

  // 1. 查询签到状态
  $httpClient.get({ url: data.infoUrl, headers: data.headers }, function (error, response, body) {
    if (error) {
      notify('上汽大众签到', '❌ 网络错误', String(error));
      return $done();
    }

    let signed = false;
    let signCount = '';
    try {
      const res = JSON.parse(body);
      if (res.code === '000000' && res.data) {
        signed = !!res.data.currentSignStatus;
        signCount = res.data.signCount;
        console.log('[SVW签到] 查询成功: 已签到=' + signed + '，连续=' + signCount + '天');
      } else {
        console.log('[SVW签到] 查询异常: ' + body);
        notify('上汽大众签到', '⚠️ 查询异常', (res.description || String(body)).slice(0, 120) + '\n凭据可能已过期，请重新捕获');
        // 查询失败时仍然尝试签到一次，避免误判
      }
    } catch (e) {
      console.log('[SVW签到] 查询响应解析失败: ' + body);
    }

    if (signed) {
      notify('上汽大众签到', '✅ 今日已签到', '已连续签到 ' + signCount + ' 天');
      return $done();
    }

    // 2. 执行签到
    const postHeaders = Object.assign({}, data.headers, { 'Content-Type': 'application/json' });
    const postBody = JSON.stringify({
      activityId: ACTIVITY_ID,
      brand: BRAND,
      userId: data.userId,
      idpId: data.idpId
    });

    $httpClient.post({ url: SIGN_URL, headers: postHeaders, body: postBody }, function (error2, response2, body2) {
      if (error2) {
        notify('上汽大众签到', '❌ 签到请求失败', String(error2));
        return $done();
      }
      try {
        const res2 = JSON.parse(body2);
        if (res2.code === '000000') {
          notify('上汽大众签到', '🎉 签到成功', (res2.data ? JSON.stringify(res2.data) : '获得积分奖励').slice(0, 150));
        } else {
          notify('上汽大众签到', '❌ 签到失败', (res2.description || String(body2)).slice(0, 150));
        }
      } catch (e) {
        notify('上汽大众签到', '❌ 签到失败', '响应: ' + String(body2).slice(0, 150));
      }
      $done();
    });
  });
}

main();
