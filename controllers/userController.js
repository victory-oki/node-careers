const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require('../models/userModel');

const filterObj = (obj, ...allowedFields) => {
    const newObj = {}
    allowedFields.forEach(fieldName=>{
        if(fieldName in obj){
            newObj[fieldName] = obj[fieldName];
        }
    });
    return newObj;
}
exports.updateMe = catchAsync(async (req, res, next) => {
    //  CREAT ERROR IF USER POSTS PASSWORD DATA
    if(req.body.password || req.body.confirmPassword){
        return next(new AppError('This route is not for password updates. Please use /updatePassword', 400));
    }
    // UPDATE USER DOCUMENT 
    const filteredBody = filterObj(req.body, 'name', 'email')
    const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, { new: true, runValidators: true });

    res.status(200).json({
        status: 'Success',
        data:{
            user: updatedUser
        }
    })
});

exports.deleteMe = catchAsync(async (req, res, next)=> {
    await User.findByIdAndUpdate(req.user._id, { active: false });
    res.status(204).json({
        status: 'success',
        data: null
    })
});