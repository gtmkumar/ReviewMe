# MongoDB Setup Instructions

Since Docker is not available on your system, you can use MongoDB Atlas (free cloud MongoDB) to test the mentor functionality.

## Option 1: MongoDB Atlas (Recommended - Free Cloud Solution)

1. **Create MongoDB Atlas Account:**
   - Go to https://www.mongodb.com/atlas/database
   - Sign up for a free account
   - Create a new project

2. **Create a Free Cluster:**
   - Click "Build a Database"
   - Choose "M0 Sandbox" (Free tier)
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Setup Database Access:**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and password (remember these!)
   - Set privileges to "Atlas Admin" for testing

4. **Setup Network Access:**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for testing only)
   - Click "Confirm"

5. **Get Connection String:**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)

6. **Update .env file:**
   - Replace the MONGODB_URI in your `.env` file with the Atlas connection string
   - Make sure to replace `<username>`, `<password>`, and `<database>` in the connection string

## Option 2: Install MongoDB Locally

If you prefer to install MongoDB locally:

1. **Download MongoDB Community Server:**
   - Go to https://www.mongodb.com/try/download/community
   - Download and install MongoDB Community Server for Windows

2. **Start MongoDB Service:**
   - MongoDB should start automatically as a Windows service
   - You can also start it manually from Services (services.msc)

3. **Use the existing connection string in .env:**
   ```
   MONGODB_URI=mongodb://localhost:27017/reviewme
   ```

## Running the Insert Script

After setting up MongoDB (either Atlas or local):

```bash
cd d:\Projects\ReviewMe
node insert-mentors.js
```

The script will:
- Connect to your MongoDB database
- Check if dummy mentors already exist
- Insert 5 dummy mentors with different expertise areas
- Create corresponding user records
- Display a summary of what was inserted

## Verifying the Data

After running the script, you can verify the mentors were inserted by:
1. Visiting http://localhost:3000/api/mentors in your browser
2. Or checking your MongoDB Atlas dashboard