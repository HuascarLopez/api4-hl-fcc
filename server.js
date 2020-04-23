const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Schema = mongoose.Schema;

const exSchema = new Schema({
  username: {
    type: String
  },
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: Date,
    default: Date.now()
  }
});

const userSchema = new Schema({
  _id: {
    type: String
  },
  username: {
    type: String,
    required: true
  }
});

const Exercise = mongoose.model("Exercise", exSchema);
const User = mongoose.model("User", userSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Add user
app.post("/api/exercise/new-user/", function(req, res) {
  User.findOne({ username: req.body.username }, function(err, user) {
    if (err) return console.log(err);

    if (user) {
      res.json({
        _id: user._id,
        username: user.username
      });
    } else {
      User.create({ _id: generateID(), username: req.body.username }, function(
        err,
        newUser
      ) {
        if (err) return console.log(err);
        return res.json({
          _id: newUser._id,
          username: newUser.username
        });
      });
    }
  });
});

// Users log
app.get("/api/exercise/users/", function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});

// Add exercise
app.post("/api/exercise/add", function(req, res) {
  User.findOne({ _id: req.body.userId }, function(err, user) {
    if (err) return console.log(err);

    if (user) {
      let newDate = "";

      if (req.body.date) {
        newDate = new Date(req.body.date);
      } else {
        newDate = new Date();
      }

      Exercise.create(
        {
          username: user.username,
          description: req.body.description,
          duration: parseInt(req.body.duration),
          date: newDate.toDateString()
        },
        function(err, exercise) {
          if (err) return console.log(err);

          res.json({
            username: user.username,
            description: req.body.description,
            duration: parseInt(req.body.duration),
            _id: user._id,
            date: exercise.date.toDateString()
          });
        }
      );
    } else {
      res.json({
        error: "404: User does not exist"
      });
    }
  });
});

// Exercises log
app.get("/api/exercise/log", function(req, res) {
  
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const limit = parseInt(req.query.limit);
  const id = req.query.userId;

  User.findById(id, (err, user) => {
    if (err) return console.log(err);
    if (user) {
      Exercise.find({
        userId: req.query.userId,
        date: {
          $lt: to != "Invalid Date" ? to.getTime() : Date.now(),
          $gt: from != "Invalid Date" ? from.getTime() : 0
        }
      })
        .sort("-date")
        .limit(limit)
        .exec((err, exercises) => {
          if (err) return console.log(err);
          const log = {
            _id: id,
            username: user.username,
            from: from != "Invalid Date" ? from.toDateString() : undefined,
            to: to != "Invalid Date" ? to.toDateString() : undefined,
            count: exercises.length,
            log: exercises.map(e => ({
              description: e.description,
              duration: e.duration,
              date: e.date.toDateString()
            }))
          };
          res.json(log);
        });
    } else {
      return console.log({ status: 400, message: "User does not exist" });
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// Function to get User ID
function generateID() {
  let id = "";
  let values = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 3; i++) {
    id += values.charAt(Math.floor(Math.random() * values.length));
  }
  return id;
}
