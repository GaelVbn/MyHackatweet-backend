var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

require("../models/connection");
const User = require("../models/users");

/* GET users listing. */
router.get("/", function (req, res) {
  const allUsers = User.find();

  try {
    if (!allUsers) {
      return res.status(500).json({ error: "Internal server error" });
    } else {
      return res.status(200).json(allUsers);
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signup", async (req, res) => {
  const { firstname, username, password } = req.body;

  if (!firstname || !username || !password) {
    return res.status(422).json({ error: "All fields are required" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(req.body.username, "i") },
    });

    if (existingUser) {
      return res.status(422).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const token = jwt.sign(
      { user_id: User._id, username },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );

    const newUser = new User({
      firstname,
      username,
      password: hashedPassword,
      token,
    });

    await newUser.save();

    res.status(201).json({
      firstname: newUser.firstname,
      username: newUser.username,
      token: token,
    });

    console.log("New user created:", newUser);
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(422).json({ error: "All fields are required" });
  }

  try {
    const user = await User.findOne({
      username: { $regex: new RegExp(req.body.username, "i") },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.status(200).json({
      firstname: user.firstname,
      username: user.username,
      token: user.token,
    });
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
