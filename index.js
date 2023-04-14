const path = require("path");
const express = require("express");
const morgan = require("morgan");
const got = require("got");
const logger = morgan("tiny");

const app = express();
app.use(express.json({}));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

const messageStore = {};

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 处理消息
app.post("/", async (req, res) => {
  console.log("消息推送", JSON.stringify(req.body));
  const { ToUserName, FromUserName, MsgType, Content, CreateTime, MsgId } =
    req.body;
  if (MsgType === "text") {
    if (messageStore[MsgId] === undefined) {
      messageStore[MsgId] = "";
      got
        .post("https://exapi-chat.zecoba.cn/v1/chat/completions", {
          headers: {
            Authorization: `Bearer ${process.env.ZECOBA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: Content }],
            temperature: 0.7,
          }),
        })
        .json()
        .then((response) => {
          // console.log(JSON.stringify(response));
          if (response && response.choices) {
            const replyMessage = response.choices[0].message.content;
            console.log(replyMessage);
            messageStore[MsgId] = replyMessage;
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
    for (let i = 0; i < 100; i++) {
      if (messageStore[MsgId]) {
        return res.send({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: CreateTime,
          MsgType: "text",
          Content: messageStore[MsgId],
        });
      }
      await timeout(100);
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
