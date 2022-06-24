const yup = require("yup");
const uuid = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRespository = require("../repositories/userRepository");
const generateOutput = require("../utils/outputFactory");
const {
  InternalServerErrorException,
} = require("../exceptions/InternalServerErrorException");

function generateAccessToken(userObj) {
  return jwt.sign(userObj, process.env.TOKEN_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRE_TIME,
  });
}
const signInSchema = yup.object().shape({
  email: yup.string().required(),
  password: yup.string().required().min(8).max(15),
});
const signUpSchema = yup.object().shape({
  first_name: yup.string().required(),
  last_name: yup.string().required(),
  birthday: yup.date().required(),
  phone_number: yup.string().required(),
  address: yup.string().required(),
  email: yup.string().email().required(),
  city: yup.string().required(),
  password: yup.string().required().min(8).max(15),
});

async function signin(email, password) {
  var res = null;
  try {
    await signInSchema.validate({ email: email, password: password });
  } catch (error) {
    return generateOutput(400, "Validation error", error.message);
  }
  try {
    res = await userRespository.getUser(email);
    if (res.rowCount == 0) {
      return generateOutput(400, "Entered  Email or Password is Incorrect");
    }
    const user = res.rows[0];
    return new Promise((resolve, reject) => {
      console.log(password);
      bcrypt.compare(password, user.password, async (err, isMatch) => {
        if (err) {
          generateOutput(
            400,
            "Error in signining the user",
            "An error occured!"
          );
        }
        if (isMatch) {
          const userObj = { ...user };
          delete userObj.password;
          resolve(
            generateOutput(200, "User succesfully signin!", {
              user: { ...userObj },
              token: generateAccessToken(user),
            })
          );
        } else {
          return generateOutput(
            400,
            "Entered  Email or Password is Incorrect",
            "Entered  Email or Password is Incorrect"
          );
        }
      });
    });
  } catch (error) {
    console.log(error);
    if (error instanceof InternalServerErrorException) {
      // Internal server error exception
      return generateOutput(500, "Error in getting the user", error.message);
    }
    return generateOutput(
      400,
      "Error in getting the user",
      "An error occured!"
    );
  }
}

async function registerUser(values) {
  try {
    await signUpSchema.validate({
      first_name: values.first_name,
      last_name: values.last_name,
      birthday: values.birthday,
      phone_number: values.phone_number,
      address: values.address,
      email: values.email,
      city: values.city,
      password: values.password,
    });
  } catch (error) {
    return generateOutput(400, "Validation error", error.message);
  }
  try {
    const res = await userRespository.getUser(values.email);
    if (res.rowCount !== 0) {
      return generateOutput(400, "User Already exixts", "User already exists");
    }
  } catch (error) {
    if (error instanceof InternalServerErrorException) {
      // Internal server error exception
      return generateOutput(
        500,
        "Error in registerering the user",
        error.message
      );
    }
    return generateOutput(
      400,
      "Error in registering the user",
      "An error occured!"
    );
  }
  const id = uuid.v4();
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, async (err, salt) => {
      if (err) {
        resolve(
          generateOutput(
            400,
            "Error in registering the user",
            "An error occured!"
          )
        );
      } else {
        bcrypt.hash(values.password, salt, async (err, hash) => {
          if (err) {
            resolve(
              generateOutput(
                400,
                "Error in registering the user",
                "An error occured!"
              )
            );
          }
          const user = {
            user_id: id,
            first_name: values.first_name,
            last_name: values.last_name,
            birthday: values.birthday,
            phone_number: values.phone_number,
            address: values.address,
            email: values.email,
            city: values.city,
            password: hash,
          };
          try {
            await userRespository.registerUser(user);
            delete user.password;
            resolve(
              generateOutput(201, "User created sucessfully!", {
                user: { user },
                token: generateAccessToken(user),
              })
            );
          } catch (error) {
            if (error instanceof InternalServerErrorException) {
              resolve(
                generateOutput(
                  500,
                  "Error in registerering the user",
                  error.message
                )
              );
            }
            resolve(
              generateOutput(400, "Error in registering the user", " occured!")
            );
          }
        });
      }
    });
  });
}

module.exports = { registerUser, signin };
