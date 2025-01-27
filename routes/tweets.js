var express = require("express");
var router = express.Router();

require("../models/connection");
const Tweet = require("../models/tweets");
const User = require("../models/users");

// Get all tweets
router.get("/all/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (user === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Tweet.find() // Populate and select specific fields to return (for security purposes)
      .populate("author", ["username", "firstName"])
      .populate("likes", ["username"])
      .sort({ createdAt: "desc" })
      .then((tweets) => {
        res.json({ result: true, tweets });
      });
  });
});

// Create a new tweet
router.post("/", async (req, res) => {
  const { token, content } = req.body;
  if (!token || !content) {
    return res.status(422).json({ error: "All fields are required" });
  }

  const checkedToken = await User.findOne({ token });
  if (!checkedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const newTweet = new Tweet({
    author: checkedToken._id,
    content,
    createdAt: new Date(),
  });

  const tweets = await newTweet.save();

  return res.status(201).json({ result: true, tweets });
});

// Delete a tweet
router.delete("/", async (req, res) => {
  const { token, tweetId } = req.body;

  if (!token || !tweetId) {
    return res.status(422).json({ error: "All fields are required" });
  }

  const findUser = await User.findOne({ token });

  if (!findUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const findTweet = await Tweet.findOne({ _id: tweetId });

  if (!findTweet) {
    return res.status(404).json({ error: "Tweet not found" });
  }

  if (findTweet.author.toString() !== findUser._id.toString()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await Tweet.deleteOne({ _id: tweetId });

  return res.status(200).json({ result: true, tweetId });
});

// Like a tweet
router.put("/like", async (req, res) => {
  const { token, tweetId } = req.body;

  if (!token || !tweetId) {
    return res.status(422).json({ error: "All fields are required" });
  }
  User.findOne({ token }).then((user) => {
    if (user === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }
    Tweet.findOne({ _id: tweetId }).then((tweet) => {
      if (tweet === null) {
        res.json({ result: false, error: "Tweet not found" });
        return;
      }
      if (tweet.likes.includes(user._id)) {
        tweet.likes.pull(user._id);
        tweet.save();
        res.json({ result: true, tweet });
        return;
      } else {
        tweet.likes.push(user._id);
        tweet.save();
        res.json({ result: true, tweet });
      }
    });
  });
});

// get hashtags
router.get("/trends/:token", async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(422).json({ error: "All fields are required" });
  }

  User.findOne({ token }).then((user) => {
    if (user === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }
    Tweet.find({ content: { $regex: /#/ } }).then((tweets) => {
      const hashtags = [];

      for (const tweet of tweets) {
        const filteredHashtags = tweet.content
          .split(" ")
          .filter((hashtag) => hashtag.startsWith("#") && hashtag.length > 1);
        hashtags.push(...filteredHashtags);
      }

      const trends = [];

      for (let hashtag of hashtags) {
        const trendIndex = trends.findIndex(
          (trend) => trend.hashtag === hashtag
        );
        if (trendIndex === -1) {
          trends.push({ hashtag, numberOfHashtag: 1 });
        } else {
          trends[trendIndex].numberOfHashtag++;
        }
      }

      res.json({
        result: true,
        trends: trends.sort((a, b) => b.numberOfHashtag - a.numberOfHashtag),
      });
    });
  });
});

// hashtag search
router.get("/hashtag/:token/:query", async (req, res) => {
  const { query, token } = req.params;

  if (!token || !query) {
    return res.status(422).json({ error: "All fields are required" });
  }

  User.findOne({ token }).then((user) => {
    if (user === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }
    Tweet.find({ content: { $regex: query } })
      .populate("author", ["firstname", "username"])
      .populate("likes", ["username"])
      .sort({ createdAt: "desc" })
      .then((tweets) => {
        res.json({ result: true, tweets });
      });
  });
});

module.exports = router;
