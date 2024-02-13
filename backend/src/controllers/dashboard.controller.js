import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelStats = await Video.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group:{
                totalViews : {
                    _id: null, // Since we want overall stats, we group all documents together
                    totalVideos: { $sum: 1 }, // Count the number of videos
                    totalViews: { $sum: "$views" }, // Sum up the views of all videos
                    // Add more aggregations as needed, like total likes, subscribers, etc.
                }
            }
        }
    ]) 

    const subscribers =  await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $count : "totalSubscribers"
        }
    ])

    const totalLikes = await Like.aggregate([
        {
            $match:{
                likedBy : new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $count:"totalLikes"
        }
    ])

    res.status(200).json(new ApiResponse(200,{ channelStats , totalLikes , subscribers },"Fetched stats successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const videos = await Video.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(req.user?._id)
            }
        }
    ])

    res
    .status(200)
    .json(new ApiResponse(200,videos,"fetched videos successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }