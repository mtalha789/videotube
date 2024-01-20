import {DB_NAME} from '../constants.js';
import mongoose from 'mongoose';

const dbConnection = async ()=>{
    try {
        console.log(process.env.MONGODB_URI);
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB Connected !! HOST : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log('MongoDB Connection Error',error)
        throw error
    }
}

export default dbConnection