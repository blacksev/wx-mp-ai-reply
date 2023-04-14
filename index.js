const path = require("path");
const express = require("express");
const morgan = require("morgan");
const got = import("got");
const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  console.log('消息推送', req.body)
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body
  if (MsgType === 'text') {
    const response = await got.post('https://exapi-chat.zecoba.cn/v1/chat/completions', {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: {
        "model": "gpt-3.5-turbo",
        "messages": [{ "role": "user", "content": Content }],
        "temperature": 0.7
      },
      json: true
    });
    if (response && response.choices && response.choices.length > 0) { 
      const replyMessage = response.choices[0].message.content;
      res.send({
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime: CreateTime,
        MsgType: 'text',
        Content: replyMessage
      });
    }
  }
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
