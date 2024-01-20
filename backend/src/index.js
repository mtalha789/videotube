import dotenv from 'dotenv'
import dbConnection from './db/index.js'
import {app} from './app.js'

dotenv.config({
    path:'./.env'
})

dbConnection()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`app listening on port: ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log('MONGODB CONNECTION FAILED !!!',err);
})