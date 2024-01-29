import {v2 as cloudinary} from 'cloudinary';
import { extractPublicId } from 'cloudinary-build-url';
import fs from "fs";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localPath) => {
    try {
        if (!localPath) return null;

        // Upload to Cloudinary
        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto",
            media_metadata: true
        });

        if(!response) return null;

        console.log('Uploaded successfully', response.url);

        // Delete local file
        fs.unlinkSync(localPath);

        return response;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);

        // Delete local file in case of error
        fs.unlinkSync(localPath);

        return null;
    }
};

const deletedOnClouinary = async (oldFileUrl) => {
    try {
        // Deleting old file
        if (!oldFileUrl) return null;

        const oldFilePublicId = extractPublicId(oldFileUrl) ;
        console.log(oldFilePublicId);
        if (oldFilePublicId) {
            await cloudinary.uploader.destroy(oldFilePublicId);
            console.log('Old file deleted successfully');
            return true
        }

    } catch (error) {
        console.error('Error deleting video on Cloudinary:', error);
    }
}


export {uploadOnCloudinary,deletedOnClouinary }