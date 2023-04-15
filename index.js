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

app.get("/", async (req, res) => {
  console.log("body", JSON.stringify(req.body));
  res.send("ok");
});

// 处理消息
app.post("/", async (req, res) => {
  console.log("body", JSON.stringify(req.body));

  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  if (MsgType === "text") {
    res.setHeader("Content-Type", "application/json");
    res.write(
      `{"ToUserName":"${FromUserName}","FromUserName":"${ToUserName}","CreateTime":${CreateTime},"MsgType":"text","Content":"`
    );
    try {
      const stream = got.stream.post(
        "https://exapi-chat.zecoba.cn/v1/chat/completions",
        {
          headers: {
            Authorization: `Bearer ${process.env.ZECOBA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: Content }],
            temperature: 0.7,
            stream: true,
          }),
        }
      );

      stream.on("data", (chunk) => {
        const str = chunk
          .toString()
          .match(/content":"([^"])+\"/g)
          ?.map((l) => l.slice(10, -1))
          .join("");
        if(str) res.write(str);
      });

      stream.on("end", () => {
        console.log("Stream ended");
        res.write('"}');
        res.end();
      });

      stream.on("error", (error) => {
        console.log(`Error: ${error.message}`);
      });
    } catch (error) {
      console.error(error);
    }
  } else {
    res.send({
      ToUserName: FromUserName,
      FromUserName: ToUserName,
      CreateTime: CreateTime,
      MsgType: "text",
      Content: "不支持非文本的消息",
    });
  }
});

const port = 80;

app.listen(port, () => {
  console.log("启动成功", port);
});
