import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(channelId))){
        throw new ApiError("Invalid channel id",400)
    }
    
    const isSubscribed = await Subscription.findOne({
        channel : channelId,
        subscriber : req.user?._id
    })

    if(!isSubscribed){
        const subscriber = await Subscription.create({
            subscriber : req.user?._id,
            channel : channelId
        })
        if(!subscriber)
        throw new ApiError("Error Subscribing channel",500)

        res
        .status(201)
        .json(new ApiResponse(201,subscriber,"Subscribed Successfully"))
    }else{
        const unsubscribed = await Subscription.deleteOne({ _id : isSubscribed._id})

        res.status(200).json(new ApiResponse(200,unsubscribed,"Unsubscribed successfully"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(channelId))){
        throw new ApiError("Invalid channel id",400)
    }

    const subscribers =  await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribers",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        }
    ])

    res
        .status(200)
        .json(new ApiResponse(200,subscribers,"Subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(subscriberId))){
        throw new ApiError("Invalid subscriber id",400)
    }
    const subscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        }
    ])
    
    res
        .status(200)
        .json(new ApiResponse(200,subscribedChannels,"Subscribed channel fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}