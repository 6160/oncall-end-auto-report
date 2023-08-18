import { api } from "@pagerduty/pdjs";
import https from "https";

const channelId = ""; //set with channel you want to spam
const tokens = {
  pagerduty: "", // pagerduty api token
  slack: "", // slack oauth token
};

const pd = api({ token: tokens.pagerduty });

const getOncallData = async () => {
  const today = new Date();
  const weekday = today.getUTCDay();
  const offset = weekday === 1 ? 3 : 1;

  let end_date = new Date(today.setDate(today.getDate()));
  let start_date = new Date(today.setDate(today.getDate() - offset));

  start_date.setHours(11, 0, 0, 0);
  end_date.setHours(11, 0, 0, 0);

  const incidents = await pd.get(`/incidents?since=${start_date}`);

  const toReport = incidents.resource.filter((el) => {
    const hourCreated = new Date(el.created_at).getHours() + 2;
  
    return (
      (hourCreated >= 20 && hourCreated <= 23) ||
      (hourCreated >= 0 && hourCreated <= 8)
    );
  });

  const oncallList = await pd.get(`/oncalls?since=${start_date}`);
  const oncalldev = oncallList.resource
    .filter((el) => el.escalation_level === 1)
    .filter((el) => {
      const end = new Date(el.end);
  
      return end <= end_date;
    });

  const oncallData = {
    name: oncalldev[0].user.summary,
    start_date,
    end_date,
    incidents: toReport.length,
  };

  return oncallData;
};

function sendMessage(message) {
  const options = {
    hostname: "slack.com",
    path: "/api/chat.postMessage",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.slack}`,
    },
  };

  const postData = JSON.stringify({
    channel: channelId,
    text: message,
  });

  const req = https.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("Message sent:", data);
    });
  });

  req.on("error", (error) => {
    console.error("Error sending message:", error);
  });

  req.write(postData);
  req.end();
}

const oncallData = await getOncallData();
const message = `reperibile: ${oncallData.name}\ndata inizio: ${oncallData.start_date}\ndata fine: ${oncallData.end_date}\ninterventi: ${oncallData.incidents}`;

sendMessage(message);
