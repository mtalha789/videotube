import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if(!videoId){
        throw new ApiError("No video to Process",400)
    }

    const isLiked = await Like.findOne({video: videoId, likedBy : req.user?._id}) 

    if(!isLiked){
        const likedVideo = await Like.create({
            likedBy : req.user?._id,
            video : videoId
        })
        if(!likedVideo)
        throw new ApiError("Error in liking video",500)

        res
        .status(201)
        .json(new ApiResponse(201,likedVideo,"Liked Successfully"))
    }else{
        const unLikedVideo = await Like.deleteOne({ _id : isLiked._id})

        res.status(200).json(new ApiResponse(200,unLikedVideo,"Unliked successfully"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!commentId){
        throw new ApiError("No Comment to Process",400)
    }

    const isLiked = await Like.findOne({comment: commentId, likedBy : req.user?._id}) 

    if(!isLiked){
        const likedComment = await Like.create({
            likedBy : req.user?._id,
            comment : commentId
        })
        if(!likedComment)
        throw new ApiError("Error in liking comment",500)

        res
        .status(201)
        .json(new ApiResponse(201,likedComment,"Liked Successfully"))
    }else{
        const unLikedComment = await Like.deleteOne({ _id : isLiked._id})

        res.status(200).json(new ApiResponse(200,unLikedComment,"Unliked successfully"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if(!tweetId){
        throw new ApiError("No tweet to process",400)
    }

    const isLiked = await Like.findOne({tweet: tweetId, likedBy : req.user?._id}) 

    if(!isLiked){
        const likedTweet = await Like.create({
            likedBy : req.user?._id,
            tweet : tweetId
        })
        if(!likedTweet)
        throw new ApiError("Error in liking tweet",500)

        res
        .status(201)
        .json(new ApiResponse(201,likedTweet,"Liked Successfully"))
    }else{
        const unLikedTweet = await Like.deleteOne({ _id : isLiked._id})

        res.status(200).json(new ApiResponse(200,unLikedTweet,"Unliked successfully"))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match:{
                likedBy : new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        avatar:1,
                                        fullName:1
                                    }
                                }
                            ]   
                        }
                    },
                    {
                        $addFields:{
                            $first:"owner"
                        }
                    }
                ]
            }
        },
        {
            $project:{
                videoFile:1,
                thumbnail:1,
                title:1
            }
        }
    ])
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}