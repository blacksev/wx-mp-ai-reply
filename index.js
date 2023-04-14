const path = require("path");
const express = require("express");
const bodyParser = require('body-parser')
const morgan = require("morgan");
const got = import("got");
const logger = morgan("tiny");
const sha1 = require("sha1");

const app = express();
app.use(bodyParser.raw())
app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(logger);

app.get("/", async (req, res) => { 
  // GET请求携带参数是个参数signature,timestamp,nonce,echostr
  const { signature, timestamp, nonce, echostr } = req.query;

  // 服务器的token
  const token = process.env.WX_TOKEN;

  // 将token、timestamp、nonce三个参数进行字典序排序 
  const arrSort = [token, timestamp, nonce];
  arrSort.sort();

  // 将三个参数字符串拼接成一个字符串进行sha1加密,npm install --save sha1
  const str = arrSort.join("");
  const shaStr = sha1(str);

  // 获得加密后的字符串可与signature对比，验证标识该请求来源于微信服务器
  if (shaStr === signature) {
    // 确认此次GET请求来自微信服务器，请原样返回echostr参数内容，则接入生效
    if (echostr) res.send(echostr);
  } else { 
    res.send('failed');
  }
});

// 处理消息
app.post("/", async (req, res) => {
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
      },
      json: true
    });
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
