const path = require("path");
const express = require("express");
const bodyParser = require('body-parser')
const morgan = require("morgan");
const got = require('got');
const logger = morgan("tiny");
const sha1 = require("sha1");

const app = express();
app.use(bodyParser.raw())
app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(logger);

// 处理消息
app.all("/", async (req, res) => {
  console.log('消息推送', JSON.stringify(req.body))
  res.send('success')
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body
  if (MsgType === 'text') {

    const response = await got.post('https://exapi-chat.zecoba.cn/v1/chat/completions', {
      headers: {
        'Authorization': `Bearer ${process.env.ZECOBA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [{ "role": "user", "content": Content }],
        "temperature": 0.7
      })
    }).json();
    console.log(JSON.stringify(response));
    if (response && response.choices) {
      const replyMessage = response.choices[0].message.content;
      console.log(replyMessage)
      try {
        const sendRes = await got.post('http://api.weixin.qq.com/cgi-bin/message/custom/send',
        // 资源复用情况下，参数from_appid应写明发起方appid
        // url: 'http://api.weixin.qq.com/cgi-bin/message/custom/send?from_appid=wxxxxx'

        {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            touser: FromUserName, // 一般是消息推送body的FromUserName值，为用户的openid
            msgtype: "text",
            text: {
              content: replyMessage
            }
          }),
        }
      ).json();
      console.log(JSON.stringify(sendRes));
      } catch (error) {
        console.log(err);
      }
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
