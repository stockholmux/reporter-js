#Reporter.JS
##Node.JS + Markdown + Google Spreadsheet + Bootstrap

Making report web pages is a drag. I needed a way to quickly make a series of dynamic, data driven web pages that were all slightly different for [Higher Ed Careers Canada](http://higheredcareers.ca) and I didn't want to be stuck being the only one that could edit them.

This is a problem that has haunted me for years. Report pages are one of those weird tasks that falls between the abilities of web devs and other office-y types. Web devs end up making them and then you have the endless updates. Oh god, the updates. Wouldn't it be great if there was better a way?

Well, let's use some of the most conceptually accessible concepts around:

* __[Markdown](https://help.github.com/articles/github-flavored-markdown)__ The purposefully limited styling language. So easy, but powerful. Dump in some HTML markup and you've got the full power of the web.
* __Google Spreadsheet__ It might not be the best format in the world to supply data to a webpage but _everyone_ gets it conceptually- 'cells' in 2D addressing and ranges of cells from the upper left to the lower right. And because Google Drive is easily accessible from a JSON API we don't have to jump through too many hoops.
* __[Bootstrap](http://getbootstrap.com/2.3.2/)__ what front end dev hasn't used it? You can supply your own stylesheet (or no style sheet at all, if that is how you roll) and nothing will break - but throw in a theme from, say, [Bootswatch](http://bootswatch.com) and, hey presto, you've got a nice responsive report.
* __Node.JS__ makes it all possible, leveraging the [Express framework](http://expressjs.com/), we have a fully working system for generating reports in a few hundred lines.

##Super simple syntax

The markup for Reporter.JS is contained between <code>&#61;</code>. Nothing successfully parsed will be visible in the final webpage.

###Associate a spreadsheet

Associating a spreadsheet is simple. This example uses the sheet published at:

`https://docs.google.com/spreadsheets/d/19xwVCTzHJCM1cmjHbyJY25JtdaEU7_stkAdp_rm-D1w/pubhtml`

The bit between `/d/` and `/pubhtml` is the document key. __The spreadsheet must be 'Published to the Web'__, to do this goto _File_ then to _Published to the Web_.

Take the key and add this somewhere in the markdown document like this:

<code>&#61;dockey:19xwVCTzHJCM1cmjHbyJY25JtdaEU7_stkAdp_rm-D1w&#61;</code>

###Pulling in a cell value
This will pull in cell A1:

<code>&#61;A1&#61;</code>

Simple, right? Just remember that cell values are always in caps - small caps won't work.

###Charts
Adding a chart is similar to adding a cell value - just add in the chart-type first then the range of cells. Like this:

<code>&#61;linechart,A2:C6&#61;</code>

The valid chart-type values are:

  * linechart
  * areachart
  * columnchart
  * piechart
  * tablechart

Chart-type is case sensitive. The graphical charts are produced using the [Google Charts API](https://developers.google.com/chart/) and are rendered client side, the 'tablechart' is rendered client side as well, but not with the Google Charts API.


##Served from RAM for speed
Because we don't want to have to wait for a request to the Google Drive API on every serve, the first successful serve does all the heavy lifting (loading markdown, making the request, rendering the jade) and stows it in RAM for the next visitor.

If you want to refresh the content for next serve, just append `/live` to the end of the URL. It adds a 100-200ms, so it is still faster than serving PHP. Don't worry, you change `/live` to another string if you are worried about it.

##Install

Use NPM.

```
npm install reporter-js
```

Then create a small script that uses it. Something like this:

```
var
  reporterjs = require('reporter-js');

reporterjs.start({
  mdDirectory : __dirname+'/mdDirectory',
  port : 3005
});
```

Upload some markdown files to the directory in `mdDirectory` attribute. Just a note - you'll need to restart the process when you add new markdown files (not needed for updates, however)

###Options and customizations

Using the `start` function, you can pass in the following options:

* `mdDirectory` - the directory where the markdown files are found (defaults to '/md')
* `prefix` - specify a path to serve from  (defaults to '/')
* `port` - the port which the server will run (defaults to `3200`)
* `staticDir` - the server directory for the static files, e.g. CSS and client side JS (defaults to `__dirname + '/public'`) 
* `staticPath` - the url path for the static files (defaults to '/public')

Most of the other functions in the `reporter.node.js` file is exported, so you can override these functions in your own node.js script.

If you already have a Express app and you want to add Reporter.JS to your app, don't use the `start` function. Try something like this:

```
var
  reporterjs = require('reporter-js'),
  app = express();
  
//other app stuff here, routes etc.
  
reporterjs.buildTemplate();  
reporterjs.routes(app,__dirName + '/md','/path/to/your/reports');
```

##License
MIT

