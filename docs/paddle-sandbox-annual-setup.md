# Paddle Sandbox 月繳／年繳設定

本專案在 Sandbox 使用同一個 Paddle product 的兩個 recurring prices：月繳 NT$499 與年繳 NT$4,999。Founder 30 的 NT$299／月 discount 只由符合資格的月繳 checkout 套用，並在同一訂閱持續有效期間永久遞迴。

## 1. Product 與 prices

在 Paddle Sandbox 進入 **Catalog > Products**：

1. 開啟現有「紙屬英文」product；不要為年繳另建 product。
2. 保留現有月繳 price，確認 currency 是 `TWD`、billing period 是每 1 `month`、金額是 `499`、quantity 最小與最大都可限制為 `1`。
3. 在同一 product 按 **New price**，建立年繳 price：currency `TWD`、金額 `4999`、billing period 每 1 `year`、quantity `1`，不設定 trial，也不要套 Founding discount。
4. 從兩個 price 的動作選單複製 `pri_...` ID。

需要保存：

- 月繳 price ID → `PADDLE_STANDARD_PRICE_ID`
- 年繳 price ID → `PADDLE_ANNUAL_PRICE_ID`
- Founder 30 discount ID → `PADDLE_FOUNDING_DISCOUNT_ID`。必須是 active、`TWD` flat discount `NT$200`、`recur = true`、`maximum_recurring_intervals = null`，且只能限制在標準月繳 price；月繳 list price 維持 NT$499，持續訂閱期間每期折抵 NT$200 成為 NT$299。

Paddle 的 product/price 模型允許一個 product 擁有不同 billing cycles 的多個 prices：[Create products and prices](https://developer.paddle.com/build/products/create-products-prices/)。

## 2. Authentication

在 **Developer Tools > Authentication**：

1. **API keys**：建立或更新 server-only Sandbox key，至少給 Transactions 的讀取／建立權限、Subscriptions 的讀取／更新（取消）權限，以及 Discounts 的讀取權限（checkout 會在套用 Founding 30 前驗證金額與期數）。建立後只顯示一次，保存成 `PADDLE_API_KEY`，不可放進 `VITE_*`。
2. **Client-side tokens**：複製 Sandbox client token，保存成 `VITE_PADDLE_CLIENT_TOKEN`。它可公開給 Paddle.js，但仍應分開 Sandbox 與 Live。

Paddle 明確區分 server-only API key 與可供 Paddle.js 使用的 client-side token：[Authentication](https://developer.paddle.com/api-reference/about/authentication/)。

## 3. Default payment link

Sandbox 也必須有 default payment link，否則建立 transaction 會回 `transaction_default_checkout_url_not_set`。

到 **Checkout > Checkout settings**（或直接開 [Sandbox checkout settings](https://sandbox-vendors.paddle.com/checkout-settings)）設定可載入目前網站的 URL；Sandbox 可使用 localhost。Paddle 說明見 [Default payment link hasn't been set](https://developer.paddle.com/errors/transactions/transaction_default_checkout_url_not_set/)。

## 4. Webhook notification destination

在 **Developer Tools > Notifications** 建立 URL destination：

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/paddle-webhook
```

訂閱以下事件：

- `subscription.created`
- `subscription.activated`
- `subscription.trialing`
- `subscription.updated`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`

若要用 Paddle Webhook Simulator，destination usage/traffic source 選 **Platform and simulation / all**。建立後複製 endpoint secret（`pdl_ntfset_...`）成 `PADDLE_WEBHOOK_SECRET`。通知目的地與事件設定說明見 [Notification destinations](https://developer.paddle.com/webhooks/about/notification-destinations/)，模擬器說明見 [Webhook simulator](https://developer.paddle.com/webhooks/simulator/)。

## 5. Supabase Edge Function secrets

在 Supabase **Edge Functions > Secrets** 設定：

```text
PADDLE_API_BASE_URL=https://sandbox-api.paddle.com
PADDLE_API_KEY=<Sandbox API key>
PADDLE_WEBHOOK_SECRET=<notification endpoint secret>
PADDLE_STANDARD_PRICE_ID=<monthly pri_...>
PADDLE_ANNUAL_PRICE_ID=<annual pri_...>
PADDLE_FOUNDING_DISCOUNT_ID=<monthly forever-recurring dsc_...>
```

> **注意**：正式環境使用 `PADDLE_API_BASE_URL=https://api.paddle.com`。若未設定 `PADDLE_API_BASE_URL`，Server-side 函式將拒絕服務（fail closed），不會預設 fallback 至 Sandbox。

前端部署環境另設：

```text
VITE_PADDLE_CLIENT_TOKEN=<Sandbox client token>
VITE_PADDLE_ENV=sandbox
```

Supabase secrets 儲存方式與更新後立即生效的行為見 [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)。

## 6. Sandbox 驗收

1. 用一位尚未訂閱的測試孩子選「年繳」，確認 checkout 顯示 NT$4,999／年且沒有 NT$299 discount。
2. 完成 Sandbox 付款後，確認訂閱頁顯示「年繳方案・每年 NT$4,999」，本期結束時間約一年後。
3. 用另一位測試孩子選「月繳」，確認一般價格 NT$499；若仍有有效 Founder 30 保留，checkout 與後續同一訂閱每期皆為 NT$299。
4. 在 Paddle notification delivery logs 確認 webhook 回 HTTP 200；在 Supabase logs 確認沒有 `processing_failed`。
5. 分別取消月繳與年繳，確認 UI 顯示「使用至」當期末，且不會立即失去已付款權益。
6. Webhook Simulator 可做額外傳送驗證，但正式權益驗收應以實際 Sandbox checkout 產生、含本專案 `custom_data.child_id` 的 subscription 為準。

Sandbox 與 Live 的 product、price、discount、API key、client token、webhook secret 都是不同資源；未來上線時必須在 Live 重建並替換全部 ID，不可沿用 Sandbox 值。
