import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { deletedOnClouinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    if(!content){
        throw new ApiError("Content is required",400)
    }

    const featuredImagesLocalPath = req.files
    
    const featuredImage = []
    for(const file of featuredImagesLocalPath){
        const cloudinaryUrl = await uploadOnCloudinary(file.path)
        featuredImage.push(cloudinaryUrl.url)
    }

    const tweet = await Tweet.create(
        {
            content,
            featuredImage,
            owner:req.user?._id
        }
    )

    res.status(201).json(new ApiResponse(201,tweet,"Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(userId))){
        throw new ApiError("Invalid UserId",400)
    }
    
    const userTweets = await Tweet.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likes",
                pipeline:[
                    {
                        $count: "totalLikes"
                    }
                ]
            }
        }
    ])

    res
    .status(200)
    .json(new ApiResponse(200,userTweets,"Retrieved Tweets Successully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    const {content} = req.body

    if(!content){
        throw new ApiError("Content is required",400)
    }
    const updatedTweet = await Tweet.updateOne(
        {_id : tweetId, owner : req.user._id},
        {$set:{content}}
    )

    if(!updatedTweet){
        throw new ApiError("Unauthorized request or error updating",401)
    }

    res
    .status(200)
    .json(new ApiResponse(200,updatedTweet,"Updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    const toDeleteTweet = await Tweet.findOne({_id : tweetId ,owner : req.user?._id}) 

    if(!toDeleteTweet){
        throw new ApiError("Unauthorized request",404)
    }

    toDeleteTweet.featuredImage.forEach(async file=> await deletedOnClouinary(file))

    const deletedTweet = await Tweet.findByIdAndDelete(toDeleteTweet._id)

    res
    .status(200)
    .json(new ApiResponse(200,deletedTweet,"Deleted Successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}