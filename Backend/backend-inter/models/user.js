import mongoose from "mongoose"; // Importing mongoose library

const userSchema = new mongoose.Schema(
    {
        email: {
            type : String,
            required : true, //mail is essential
            unique : true //mail should be unique Ekama mail eken account 2k hadanna baa

        },
        firstName: {
            type : String,
            required : true,
        },
        lastName: {
            type : String,
            required : true, //last name is essential
        },
            
        password: {
            type : String,
            required : true, //password is essential
        },
        role: { //which user act as custtomer or admin
            type : String,
            required : true,
            enum : ["customer", "admin"], //only these 2 values are allowed,role ekata danna puluwan me 2 witharai
            default : 'customer' //default role is customer
        },
        isBlocked :{
            type : Boolean,
            default : false, //by default user is not blocked
            required : true
        }, 
        isEmailVerified :{
            type : Boolean,
            default : false,
            required : true 
        }, 
        image :{
            type : String,
            default : "/images/default-profile.png"

        },
        token: {
            type: String,
            default: null
        }

    }
)

const userModel = mongoose.model("user",userSchema) //user is the collection name,collection ekai backend ekai athara sambandathawaya hadanne userModel eken

export default userModel;//Model kiyanne data vala structure eka