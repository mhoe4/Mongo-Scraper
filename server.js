var express = require("express");
var mongoose = require("mongoose");

// Our scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Handlebars
var exphbs = require("express-handlebars");

// Require all models
var db = require("./models");

// Set PORT
var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));
// Setup Handlebars
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// MongoDB Config
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Scrape Sit Url
const scrapeSiteUrl = "http://www.echojs.com/";

// Scrape -------------------------------------------------
// First, we grab the body of the html with axios
axios.get(scrapeSiteUrl).then(function (response) {
  // Then, we load that into cheerio and save it to $ for a shorthand selector
  let $ = cheerio.load(response.data);

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
    // if this is a new Article
    db.Article.where({ title: result.title }).findOne({})
      .then((res) => {
        if (res === null) {
          db.Article.create(result)
            .then((dbArticle) => {
              console.log(`Creating new article: ${dbArticle}`);
            })
            .catch((err) => {
              if (err) throw err;
            })
        };
      });

  });

});

// Routes --------------------------------------------
app.get("/", function (req, res) {
  db.Article.find({}).sort({ headline: 1 })
    .then((response) => {
      let object = {
        articles: response
      };
      res.render("index", object);
    });
});

app.get("/article/", function (req, res) {
  let id = "5cb224a08027c3ba379e9e56";
  console.log(id);
  db.Article.where({ _id: id}).find({})
    .then((response) => {
      console.log(response);
      let object = {
        articles: response
      };
      res.json(object);
    });
});

app.get("/comment/", function (req, res) {
  let id = "5cb223c4f7e868ac335deca8";
  console.log(id);
  db.Comment.where({ _id: id}).find({})
    .then((response) => {
      console.log(response);
      
      res.json(response);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/api/comment/:id", function (req, res) {
  console.log("====================================================================================");
  console.log(req.body);
  console.log("====================================================================================");

  // Create a new note and pass the req.body to the entry
  db.Comment.create({ body: req.body })
    .then(function (dbComment) {
      console.log("====================================================================================");

      console.log(dbComment);
      console.log("====================================================================================");

      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { comments: dbComment._id } }, { new: true });
    })
    .then(function (dbComment) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbComment);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// //API Route to Post a comment
// app.post("/api/comment/:id", function(req, res) {
//   db.Comment.create({ body: req.params.body })
//     .then(function(dbComment) {
//       console.log(dbComment);
//       let data = db.Comment.findOneAndUpdate({ _id: req.params.id}, { $push: { comments: dbComment._id } }, { new: true });
//       console.log(data);
//       return data;
//     })
//     .then(function(dbComment) {
//       // If the User was updated successfully, send it back to the client
//       res.json(dbComment);
//       //res.render("index", {});
//     })
//     .catch(function(err) {
//       // If an error occurs, send it back to the client
//       res.json(err);
//     });
// });

// app.post("/api/del", function(req, res) {
//   db.Comments.findByIdAndDelete(req.body.cid, (err, todo) => {
//     if (err) return res.status(500).send(err);
//   });
//   res.render("comment", {});
// });


// A GET route for scraping the echoJS website
// app.get("/scrape", function (req, res) {

// });

// app.get("/saved", function (req, res) {
//   res.render("saved");
// });

// app.get("/api/headlines", function (req, res) {
//   console.log("hi");
//   db.Article.find({ saved: true })
//     .then(function (dbArticle) {
//       // If we were able to successfully find Articles, send them back to the client
//       res.json(dbArticle);
//     })
//     .catch(function (err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });
// app.delete("/api/headlines/:id", function (req, res) {
//   console.log("hi");
//   db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { saved: false } }, { new: true }).then((docs) => {
//     if (docs) {
//       resolve({ success: true, data: docs });
//     } else {
//       reject({ success: false, data: "no such user exist" });
//     }
//   }).catch((err) => {
//     reject(err);
//   });
// });

// app.get("/api/notes/:id", function (req, res) {
//   // Grab every document in the Articles collection
//   db.Article.find({ _id: req.params.id })
//     .then(function (dbArticle) {
//       console.log(dbArticle);
//       // If we were able to successfully find Articles, send them back to the client
//       res.json(dbArticle);
//     })
//     .catch(function (err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });

// Route for getting all Articles from the db
// app.get("/articles", function (req, res) {
//   // Grab every document in the Articles collection
//   db.Article.find({})
//     .then(function (dbArticle) {
//       // If we were able to successfully find Articles, send them back to the client
//       res.json(dbArticle);
//     })
//     .catch(function (err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });

// Route for grabbing a specific Article by id, populate it with it's note
// app.get("/articles/:id", function (req, res) {
//   // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
//   db.Article.findOne({ _id: req.params.id })
//     // ..and populate all of the comments associated with it
//     .populate("comment")
//     .then(function (dbArticle) {
//       // If we were able to successfully find an Article with the given id, send it back to the client
//       res.json(dbArticle);
//     })
//     .catch(function (err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });

// app.put("/articles/:id", function (req, res) {
//   db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { saved: true } }, { new: true }).then((docs) => {
//     if (docs) {
//       resolve({ success: true, data: docs });
//     } else {
//       reject({ success: false, data: "no such user exist" });
//     }
//   }).catch((err) => {
//     reject(err);
//   });

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
// });

// Route for saving/updating an Article's associated Comment
// app.post("/articles/:id", function (req, res) {
//   // Create a new comment and pass the req.body to the entry
//   db.Comment.create(req.body)
//     .then(function (dbComment) {
//       // If a Comment was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
//       // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
//       // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
//       return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
//     })
//     .then(function (dbArticle) {
//       // If we were able to successfully update an Article, send it back to the client
//       res.json(dbArticle);
//     })
//     .catch(function (err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
