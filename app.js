const express = require("express");
const postingRouter = require("./routes/postingRoutes");
const userRouter = require("./routes/userRoutes");
const globalErrorHandler = require('./controllers/errorController');
const app = express();
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

//SET SECURITY HTTP HEADERS
app.use(helmet());
// express.json is a middle ware that adds the data of body to the request
app.use(express.json({ limit: '10kb' }));
//serving static files
app.use(express.static(`${__dirname}/public`));

//RATE LIMITING (LIMIT REQUEST FROM SAME IP)
const limiter = rateLimiter({
  max: 100,
  windowMs: 60*60*1000,
  message: 'Too many requests from this IP, please try again in an hour'
})
app.use("/api", limiter);

//DATA SANITIZATION AGAINST NOSQL ATTACKS
app.use(mongoSanitize());

//DATA SANITIZATION AGAINST XSS
app.use(xss());

//PREVENT PARAMETER POLLUTION
app.use(hpp())

app.use("/api/v1/postings", postingRouter);
app.use("/api/v1/users", userRouter);

app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server`,
  });

  const err = new AppError(`Can't find ${req.originalUrl} on this server`, 404);
  next(err);
});

app.use(globalErrorHandler);

module.exports = app;
