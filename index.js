const path = require("path");
const express = require("express");
const bodyParser = require('body-parser')
const morgan = require("morgan");
import got from 'got';
const logger = morgan("tiny");
const sha1 = require("sha1");

const app = express();
app.use(bodyParser.raw())
app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(logger);

// 处理消息
app.all("/", async (req, res) => {
  console.log('消息推送', req.body)
  
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body
  if (MsgType === 'text') {
    const response = await got.post('https://exapi-chat.zecoba.cn/v1/chat/completions', {
      headers: {
        'Authorization': `Bearer ${process.env.ZECOBA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: {
        "model": "gpt-3.5-turbo",
        "messages": [{ "role": "user", "content": Content }],
        "temperature": 0.7
      }
    }).json();
    if (response && response.choices && response.choices.length > 0) {
      const replyMessage = response.choices[0].message.content;
      return res.send({
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime: CreateTime,
        MsgType: 'text',
        Content: replyMessage
      });
    }
  }
  res.send('success')
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
