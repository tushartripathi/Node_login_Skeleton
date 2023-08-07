const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

//tushartripathi301997
//p55tXValaip1pXdD
//mongodb+srv://tushartripathi301997:<password>@cluster0.jd7huj2.mongodb.net/

const SECRET = 'SECr3t'; // This should be in an environment variable in a real application

mongoose.connect('mongodb+srv://tushartripathi301997:p55tXValaip1pXdD@cluster0.jd7huj2.mongodb.net/Course', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: "Course"
});

// Define mongoose schemas
const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  username: String,
  password: String,
  purchasedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }]
});

const adminSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  username: String,
  password: String
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  ratingCount:{
    type: Number,
    default: 0,
  },
  commentCount:{
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
  },
  published: Boolean,
});

const ratingScheme = new mongoose.Schema({
  purchasedCourses: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  rating: {
    type: Number,
    default: 0,
  },
  comment: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
});

// Define mongoose models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);
const Rating = mongoose.model('Rating', ratingScheme);

// Middlewares
// auth MW
const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};


//null Check MW
const notNull = (req, res, next) => {
  const {
    firstname,
    lastname,
    username,
    password
  } = req.body;
  if (checkIfNotNull(firstname) && checkIfNotNull(lastname) && checkIfNotNull(username) && checkIfNotNull(password)) {
    next()
  } else
    return res.json({
      "errorMessage": "Send All fields"
    })

};


app.post('/admin/signup', notNull, async (req, res) => {
  const {
    firstname,
    lastname,
    username,
    password
  } = req.body;

  var admin = await Admin.findOne({
    username
  });

  if (admin) {
    res.status(403).json({
      message: 'Admin already exists'
    });
  } else {
    const obj = {
      firstname: firstname,
      lastname: lastname,
      username: username,
      password: password
    };
    console.log(obj);
    const newAdmin = new Admin(obj);
    await newAdmin.save();
    const token = jwt.sign({
      username,
      role: 'admin'
    }, SECRET, {
      expiresIn: '1h'
    });
    res.json({
      message: 'Admin created successfully',
      token
    });
  }

});

app.post('/admin/login', async (req, res) => {
  const {
    username,
    password
  } = req.headers;

  const admin = await Admin.findOne({
    username,
    password
  });
  if (admin) {
    const token = jwt.sign({
      username,
      role: 'admin'
    }, SECRET, {
      expiresIn: '1h'
    });
    res.json({
      message: 'Logged in successfully',
      token
    });
  } else {
    res.status(403).json({
      message: 'Invalid username or password'
    });
  }
});

app.post('/admin/courses', authenticateJwt, async (req, res) => {
  if (checkIfNotNull(req.body.title) && checkIfNotNull(req.body.description) && checkIfNotNull(req.body.price)) {
    const course = new Course(req.body);
    await course.save();
    res.json({
      message: 'Course created successfully',
      courseId: course.id
    });
  } else {
    res.json({
      "errorMessage": "Send necessary Info {title,description,price"
    });
  }

});

app.put('/admin/courses/:courseId', authenticateJwt, async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, {
    new: true
  });
  if (course) {
    res.json({
      message: 'Course updated successfully'
    });
  } else {
    res.status(404).json({
      message: 'Course not found'
    });
  }
});

app.get('/admin/courses', authenticateJwt, async (req, res) => {
  const courses = await Course.find({});
  res.json({
    courses
  });
});

// User routes
app.post('/users/signup', notNull, async (req, res) => {
  const {
    firstname,
    lastname,
    username,
    password
  } = req.body;
  const user = await User.findOne({
    username
  });
  if (user) {
    res.status(403).json({
      message: 'User already exists'
    });
  } else {
    const newUser = new User({
      firstname,
      lastname,
      username,
      password
    });
    await newUser.save();
    const token = jwt.sign({
      username,
      role: 'user'
    }, SECRET, {
      expiresIn: '1h'
    });
    res.json({
      message: 'User created successfully',
      token
    });
  }
});

app.post('/users/login', async (req, res) => {
  const {
    username,
    password
  } = req.headers;
  const user = await User.findOne({
    username,
    password
  });
  if (user) {
    const token = jwt.sign({
      username,
      role: 'user'
    }, SECRET, {
      expiresIn: '1h'
    });
    res.json({
      message: 'Logged in successfully',
      token
    });
  } else {
    res.status(403).json({
      message: 'Invalid username or password'
    });
  }
});

app.get('/users/courses', authenticateJwt, async (req, res) => {
  const courses = await Course.find({
    published: true
  });
  res.json({
    courses
  });
});

app.post('/users/courses/:courseId', authenticateJwt, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  console.log(course);
  if (course) {
    const user = await User.findOne({
      username: req.user.username
    });
    if (user) {
      user.purchasedCourses.push(course);
      await user.save();
      res.json({
        message: 'Course purchased successfully'
      });
    } else {
      res.status(403).json({
        message: 'User not found'
      });
    }
  } else {
    res.status(404).json({
      message: 'Course not found'
    });
  }
});

app.get('/users/purchasedCourses', authenticateJwt, async (req, res) => {
  const user = await User.findOne({
    username: req.user.username
  }).populate('purchasedCourses');
  if (user) {
    res.json({
      purchasedCourses: user.purchasedCourses || []
    });
  } else {
    res.status(403).json({
      message: 'User not found'
    });
  }
});

app.post('/users/purchasedCourses/rating/:courseId', authenticateJwt, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  var cRating = course.rating;
  // CHECK if courser is bought 

  // check if already reviewed 

  // add/ udpate review
  console.log(cRating);

  console.log("1");
  if (course) {

    const user = await User.findOne({
      username: req.user.username
    });

  console.log("2");
    if (user) {
      const rating = await Rating.findOne({
        user: user.id,
        purchasedCourses: course.id
      });

      var ratingMultiple = course.rating * course.ratingCount

      if (rating) {

        if(req.body.comment)
        {
          if(!rating.comment)
            course.commentCount = course.commentCount+1;
          rating.comment = req.body.comment;
        }
        if(req.body.rating)
        {
          var oldRating = rating.rating;
          ratingMultiple = ratingMultiple-oldRating+req.body.rating;
          
          if(!rating.rating)
            course.ratingCount = course.ratingCount+1;
          rating.rating = req.body.rating;

          course.rating = parseInt( ratingMultiple) / parseInt(course.ratingCount);
        }

        var ratingMultiple = parseInt(course.rating) * parseInt(course.ratingCount)

        await course.save();
        await rating.save();

        res.json({
          message: 'Rating is updated',
          rating : rating
        });
      } else {

        //create a rating 
        var ratingMultiple = course.rating * course.ratingCount
        console.log(ratingMultiple + " initialziy");
        if(req.body.rating)
        {
          course.ratingCount = course.ratingCount+1;
        }
        if(req.body.comment)
        {
          course.commentCount = course.commentCount+1;
        }

     
        var  sum = parseInt(ratingMultiple) + parseInt(req.body.rating);
        
        
        course.rating = sum/parseInt(course.ratingCount)

       
        await course.save();

        const newRating = new Rating({
          purchasedCourses: course.id,
          rating: req.body.rating,
          comment: req.body.comment,
          user: user.id, // Replace 'User ID here' with the actual User ID
        });

        await newRating.save();

        res.status(200).json({
          message:newRating
        });
      }
    }
    else
    {
      res.status(403).json({
        message: 'User not found'
      });
    }
  } else {
    res.status(404).json({
      message: 'Course not found'
    });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));


//Util Functions

function checkIfNotNull(value) {
  if (value != null && value != '' && value != undefined) {
    return true;
  }
  return false;
}