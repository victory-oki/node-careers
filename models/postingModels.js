const { type } = require('express/lib/response');
const mongoose = require('mongoose');
const postingSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A posting must have a name'],
            unique: true,
        },
        about: {
            type: String,
            required: [true, 'A posting must have an about'],
        },
        jobType: {
            type: String,
            required: [true, 'A posting must have a type'],
            enum: {
              values: ['Permanent', 'Contract'],
              message: 'Job type is either: Permanant, Contract',
            },
        },
        whatYouWillDo: {
            type: [String],
            required: [true, 'A posting must describe what the applicant would do as an employee'],
        },
        requirements: {
            type: [String],
        },
        applicationInstructions: {
            type: [String],
        } 
    }
)

const Posting = mongoose.model('Posting', postingSchema)
module.exports = Posting;

//
// POSTING

// Name
// About position
// location
// Job type
// what you would do
// requirement 
// Application instruction