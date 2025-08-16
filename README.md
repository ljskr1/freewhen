# 🕐 FreeWhen - Cross-Timezone Availability Finder

**FreeWhen** is a web app that helps friends across different timezones find the perfect time to connect. Simply tell the app your availability in natural language, and it will find common free time slots between you and your friends.

## ✨ Features

- **Natural Language Input**: Tell the app your schedule in plain English
  - "I'm free tomorrow from 9 AM to 5 PM"
  - "I have work on Sunday 6 PM to 10 PM, but free from 11 PM to 2 AM"
  - "I don't have work tomorrow"

- **Smart Parsing**: Understands various ways people express time and availability
- **Timezone Support**: Auto-detects your timezone and supports 10+ common timezones
- **Interactive Calendar**: Visual calendar showing your availability
- **Chat Interface**: Natural conversation flow with FreeWhen
- **Dark Mode**: Beautiful Apple-like dark interface
- **Mobile First**: Optimized for both mobile and desktop browsers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/freewhen.git
   cd freewhen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Day Picker** - Calendar component

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **date-fns** - Date manipulation library
- **date-fns-tz** - Timezone support

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Turbopack** - Fast bundler

## 📱 How to Use

1. **Set Your Timezone**: Use the timezone selector in the top-right corner
2. **Add Your Availability**: Type in the chat box at the bottom
3. **Examples**:
   - "I'm free tomorrow from 9 AM to 5 PM"
   - "I have work on Sunday 6 PM to 10 PM, but free from 11 PM to 2 AM"
   - "I don't have work tomorrow"
4. **View Results**: Your availability appears on the calendar
5. **Find Common Times**: When friends add their schedules, common free slots are highlighted

## 🚀 Deployment Guide

### Step 1: Prepare for Deployment

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Test the build**
   ```bash
   npm start
   ```

### Step 2: Choose Your Hosting Platform

#### Option A: Vercel (Recommended - Free)
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Choose your Git repository
   - Deploy!

#### Option B: Netlify (Free)
1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**
   ```bash
   netlify deploy
   ```

3. **Build and deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=out
   ```

#### Option C: Railway (Free tier available)
1. **Connect your GitHub repo**
2. **Auto-deploy on push**

### Step 3: Get a Domain (Optional)

#### Free Domain Options:
- **Freenom** - Free .tk, .ml, .ga domains
- **GitHub Pages** - username.github.io
- **Vercel** - username.vercel.app

#### Paid Domain Options:
- **Namecheap** - $8-12/year
- **GoDaddy** - $10-15/year
- **Google Domains** - $12/year

### Step 4: Connect Domain to Hosting

1. **Get DNS settings** from your hosting provider
2. **Update DNS records** at your domain registrar
3. **Wait for propagation** (up to 48 hours)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```bash
# Timezone settings
DEFAULT_TIMEZONE=Australia/Melbourne

# API settings (for future features)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Customization

- **Colors**: Edit `app/globals.css` for theme colors
- **Timezone List**: Modify `components/TimezoneSelector.tsx`
- **Natural Language Patterns**: Update `pages/api/parse-availability.ts`

## 🧠 AI Context Limit Solutions

### Problem
When using AI assistants for coding, you hit context limits after multiple iterations.

### Solutions

#### 1. **Detailed Documentation Approach**
Ask the AI to:
- Write comprehensive documentation
- Include code comments
- Create step-by-step guides
- Document every decision made

#### 2. **Modular Development**
- Break features into small, independent components
- Document each component separately
- Use clear file naming conventions

#### 3. **Version Control Strategy**
- Commit after each major feature
- Write descriptive commit messages
- Use branches for different features

#### 4. **AI Prompt Template**
```
I'm building [PROJECT_NAME]. Here's what I need:

**Current State:**
- What's already built
- What's working
- What's not working

**What I Need:**
- Specific feature description
- Any constraints or requirements
- Expected behavior

**Context:**
- Tech stack being used
- Any relevant code snippets
- Previous decisions made

Please provide:
1. Step-by-step implementation
2. Code with detailed comments
3. Any configuration changes needed
4. Testing instructions
5. Next steps for future development

Keep responses focused and actionable.
```

## 🔮 Future Features

- **Google Calendar Integration** - Sync with your existing calendar
- **Microsoft Calendar Support** - Outlook integration
- **Apple Calendar Sync** - iCloud calendar support
- **Meeting Scheduler** - Auto-create Google Meet/Zoom calls
- **Team Support** - Multiple friends and groups
- **Recurring Availability** - Set weekly schedules
- **Push Notifications** - Get notified of common free times
- **Mobile App** - Native iOS/Android apps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: your-email@example.com

## 🙏 Acknowledgments

- Built with Next.js and React
- Icons by Lucide
- Timezone handling by date-fns
- Beautiful UI with Tailwind CSS

---

**Made with ❤️ for friends across timezones**
