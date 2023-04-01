const { promisify }  = require('util')
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const { update } = require('../models/userModel');
const { env } = require('process');

const signToken = id => {
    return jwt.sign({id}, process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true
}
if(process.env.NODE_ENV === 'production')  cookieOptions.secure = true;

const createSendToken = (user, statusCode, res) => {
    const token  = signToken(user._id);
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next)=>{
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        role: req.body.role,
        passwordChangedAt: req.body.passwordChangedAt,
    });
    createSendToken( newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next)=>{
    const {email, password} = req.body;
    
    //CHECK IF EMAIL AND PASSWORD EXIST
    if(!email || !password){
       return next(new AppError('Please provide email and password', 400));
    }
    //CHECK IF THE USER EXITS && PASSWORD IS CORRECT
    const user = await User.findOne({email}).select('+password');

    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError("Incorrect email or password", 401));
    }
    //IF EVERYTHING IS OKAY SEND TOKEN TO CLIENT 
    createSendToken( user, 200, res);
});

exports.protect = catchAsync(async (req, res, next)=>{
    // GETTING TOKEN AND CHECK IF IT'S THERE
    let token;
    const {authorization} = req.headers;
    if(authorization && authorization.startsWith('Bearer')){
        token = authorization.split(' ')[1];
    }
    if(!token){
        return next(new AppError('You are not logged in!, please log in to get access', 401));
    }
    // VERIFICATION OF TOKEN
    const decodedData = await jwt.verify(token, process.env.JWT_SECRET)
    // CHECK IF USER STILL EXISTS
    const freshUser = await User.findById(decodedData.id);
    if(!freshUser){
        return next(new AppError('The user belonging to this token does not exist', 401));
    }
    //CHECK IF USER CHANGED PASSWORD AFTER THE TOKEN WAS ISSUED
    if(freshUser.changedPasswordAfter(decodedData.iat)){
        return next(new AppError('User recently changed password! please log in again', 401));
    }
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = freshUser;
    next();
});

exports.restrictTo = (...roles)=>{
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next();
    }
}

exports.forgotPassword = catchAsync(async (req,res, next)=>{
    //GET USER BASED ON POSTED EMAIL
    const user  = await User.findOne({email: req.body.email});
    if(!user){
        return next(new AppError('There is no user with email address.', 404))
    }
    //GENERATE RANDOM RANDOM RESET TOKEN
    const resetToken = user.createPasswordResetToken();
    
    await user.save({validateBeforeSave: false}); //this is cause the instance method updates some fields like (passwordResetToken & passwordResetExpires)
    // the validateBeforeSave is set to false to enable you save without running validation 
    // SEND IT TO USER'S EMAIL
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with you new password and confirmPassword to: ${resetURL}. \nIf you
    didn't forget your password, please ignore this email!`;

    try{
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message
        })
    
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        })
    }
     catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was an error sending the email. Try again later!', 500));
     }
}); 
exports.resetPassword = catchAsync(async (req,res, next)=>{
    // GET USER FROM TOKEN
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken, 
        passwordResetExpires: { $gt: Date.now() }
    });
    // CHECK IF TOKEN HAS NOT EXPIRED AND THERE IS USER, SET THE PASSWORD
    if(!user){
        return next(new AppError('Token does not exist or has expired', 400))
    }
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // UPDATE passwordChangedAt property
    // LOG THE USER IN, SEND JWT
    createSendToken( user, 200, res);
})

exports.updatePassword = catchAsync(async (req, res, next)=>{
    //GET USER FROM COLLECTION
    const user = await User.findById(req.user._id).select('+password');
    const isCorrect = await user.correctPassword(req.body.currentPassword, user.password);
    // CHECK IF CURRENT PASSWORD IS CORRECT
    if(!isCorrect){
        return next( new AppError('The password you have provided is incorrect', 401))
    }
    // SET PASSWORD
    user.password = req.body.newPassword;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();
    // LOG IN USER AND SEND TOKEN
    createSendToken( user, 200, res);
})
