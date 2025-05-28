import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js'; 
import bcrypt from 'bcrypt'; 


const User = sequelize.define('User', {
  // --- Your Existing Attributes ---
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
 full_name: {
    type: DataTypes.STRING, 
    allowNull: true
  },
 
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  livekitRoomName: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true, // Room names should be unique per active stream
},
  profile_picture_url: {
    type: DataTypes.STRING(255)
  },
  bio: {
    type: DataTypes.TEXT
  },
  seller_rating: {
    type: DataTypes.DECIMAL(3, 2)
  },
  buyer_rating: {
    type: DataTypes.DECIMAL(3, 2)
  },
  stripe_customer_id: {
    type: DataTypes.STRING(100)
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_login: {
    type: DataTypes.DATE
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_banned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {

  tableName: 'users',
  timestamps: true, 
  createdAt: 'created_at', 
  updatedAt: 'updated_at', 
  underscored: true,

  // --- Hooks ---
  hooks: {
    // Hook to hash password BEFORE a new user record is created
    beforeCreate: async (user, options) => {
      if (user.password_hash) { 
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
    // Hook to hash password if it's explicitly changed during an update
    beforeUpdate: async (user, options) => {
      
      if (user.changed('password_hash')) {
         const salt = await bcrypt.genSalt(10);
         user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
     
    }

  },


  // Automatically exclude 'password_hash' from queries unless specified otherwise
  defaultScope: {
    attributes: { exclude: ['password_hash'] },
  },


  scopes: {
    
    withPassword: {
    
      attributes: {},
    },
   
  },

});


User.prototype.comparePassword = async function(candidatePassword) {
  
  if (!candidatePassword || !this.password_hash) {
     return false;
  }
 
  return bcrypt.compare(candidatePassword, this.password_hash);
};


export default User;