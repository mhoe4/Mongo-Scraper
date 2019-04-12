var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));



app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
// Connect to the Mongo DB
//mongoose.connect("mongodb://localhost/mongoHeadlines", { useNewUrlParser: true });

const scrapeSiteUrl = "http://www.echojs.com/";

// Routes
app.get("/", function (req, res) {

  res.render("index");
  // var hbsObj = {};
  // hbsObj.site = scrapeSiteUrl;
  // db.Article.find({})
  //   .populate("comments")
  //   .then(function (dbLibrary) {
  //     // If any Libraries are found, send them to the client with any associated Books
  //     hbsObj.article = dbLibrary;
  //     // console.log("hbsObj",hbsObj.news[0]);
  //     res.render("index", hbsObj);
  //   })
  //   .catch(function (err) {
  //     // If an error occurs, send it back to the client
  //     res.json(err);
  //   });
});

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get(scrapeSiteUrl).then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.headline = $(this)
        .children("a")
        .text();
      result.summary = $(this)
        .children("a")
        .text();
      result.url = $(this)
        .children("a")
        .attr("href");
      result.saved = false;

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

app.get("/saved", function (req, res) {
  res.render("saved");
});

app.get("/api/headlines", function (req, res) {
  console.log("hi");
  db.Article.find({saved: true})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});
app.delete("/api/headlines/:id", function (req, res) {
  console.log("hi");
  db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { saved: false } }, { new: true }).then((docs) => {
    if (docs) {
      resolve({ success: true, data: docs });
    } else {
      reject({ success: false, data: "no such user exist" });
    }
  }).catch((err) => {
    reject(err);
  });
});

app.get("/api/notes/:id", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({_id: req.params.id})
    .then(function (dbArticle) {
      console.log(dbArticle);
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the comments associated with it
    .populate("comment")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.put("/articles/:id", function (req, res) {
  db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { saved: true } }, { new: true }).then((docs) => {
    if (docs) {
      resolve({ success: true, data: docs });
    } else {
      reject({ success: false, data: "no such user exist" });
    }
  }).catch((err) => {
    reject(err);
  });

  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  // db.Article.findOneAndUpdate({ _id: req.params.id })

  //   .update({ saved: true })
  //   .then(function (dbArticle) {
  //     // If we were able to successfully find an Article with the given id, send it back to the client
  //     console.log(dbA)
  //     res.json(dbArticle);
  //   })
  //   .catch(function (err) {
  //     // If an error occurred, send it to the client
  //     res.json(err);
  //   });
});

// Route for saving/updating an Article's associated Comment
app.post("/articles/:id", function (req, res) {
  // Create a new comment and pass the req.body to the entry
  db.Comment.create(req.body)
    .then(function (dbComment) {
      // If a Comment was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
