import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name || !description){
        throw new ApiError("Name and description is required",400)
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner:req.user?._id
    })

    res.status(201).json(new ApiResponse(201,playlist,"Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(userId))){
        throw new ApiError("Invalid UserId",400)
    }
    const userPlaylists = await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
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
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addFields:{
                $first:"$owner"
            }
        }
    ])

    res
    .status(200)
    .json(new ApiResponse(200,userPlaylists,"Playlists retrieved successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(new mongoose.Types.ObjectId(playlistId))){
        throw new ApiError("Invalid playlist id",400)
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId)
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
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addFields:{
                $first:"$owner"
            }
        }
    ])

    res
    .status(200)
    .json(new ApiResponse(200,playlist,"Playlist retrieved successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(playlistId))){
        throw new ApiError("Invalid playlist id",400)
    }

    if(!isValidObjectId(new mongoose.Types.ObjectId(videoId))){
        throw new ApiError("Invalid video id",400)
    }

    const updatedPlaylist = await Playlist.updateOne(
        {
            owner : req.user?._id,
            _id : playlistId
        },
        {
            $push:{
                videos:videoId
            }
        }
    )

    if(!updatedPlaylist){
        throw new ApiError("Unauthorized request or error updating playlist",401)
    }

    res
    .status(200)
    .json(new ApiResponse(200,updatedPlaylist,"Added video successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(playlistId))){
        throw new ApiError("Invalid playlist id",400)
    }

    if(!isValidObjectId(new mongoose.Types.ObjectId(videoId))){
        throw new ApiError("Invalid video id",400)
    }

    const updatedPlaylist = await Playlist.updateOne(
        {
            owner : req.user?._id,
            _id : playlistId
        },
        {
            $pop:{
                videos:videoId
            }
        }
    )

    if(!updatedPlaylist){
        throw new ApiError("Unauthorized request or error updating playlist",401)
    }

    res
    .status(200)
    .json(new ApiResponse(200,updatedPlaylist,"Removed video successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(playlistId))){
        throw new ApiError("Invalid playlist id",400)
    }

    const deletedPlaylist = await Playlist.deleteOne({
        _id : playlistId,
        owner : req.user?._id
    })

    if(!deletedPlaylist){
        throw new ApiError("Unauthorized request or error updating playlist",401)
    }

    res
    .status(200)
    .json(new ApiResponse(200,deletedPlaylist,"playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!isValidObjectId(new mongoose.Types.ObjectId(playlistId))){
        throw new ApiError("Invalid playlist id",400)
    }

    if(!name && !description){
        throw new ApiError("no field to update",400)
    }

    const playlist = await Playlist.findOne({
        _id : playlistId,
        owneer : req.user?._id
    })

    if(!playlist){
        throw new ApiError("Unauthorized request or playlist does not exist",401)
    }

    if(name) playlist.name = name
    if(description) playlist.description = description

    const updatedPlaylist = await playlist.save({validateBeforeSave : false})

    res
    .status(200)
    .json(new ApiResponse(200,updatedPlaylist,"Updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}