import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import JWT from "jsonwebtoken"

export const verifyJWT = asyncHandler( async(req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError("Unauthorized request",401)
    }

    const decodedToken = JWT.verify(token,process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if (!user) {
        throw new ApiError("Invalid access token",401)
    }
    req.user=user
    next()
})
