# 🖼️ Generate Busy Bees Images

## Quick Start

### Option 1: Python Script (Recommended)
```bash
# 1. Install required packages
pip install openai requests

# 2. Set your OpenAI API key
export OPENAI_API_KEY="your-openai-api-key-here"

# 3. Run the script
python generate-images.py
```

### Option 2: Bash Script
```bash
# 1. Set your OpenAI API key
export OPENAI_API_KEY="your-openai-api-key-here"

# 2. Run the script
./generate-images.sh
```

## Getting Your OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key and set it as an environment variable

## What the Scripts Do

Both scripts will:
- ✅ Generate 16 photorealistic images using DALL-E 3
- ✅ Save them to `/public/images/` with proper filenames
- ✅ Skip existing images (won't regenerate)
- ✅ Show progress and success/failure counts
- ✅ Handle errors gracefully

## Generated Images

The scripts will create these 16 images:

### Party Gallery (6 images)
- `princess-party-magic.jpg` - Princess themed birthday party
- `superhero-squad.jpg` - Kids in superhero costumes
- `face-painting-fun.jpg` - Professional face painter at work
- `birthday-cake-moment.jpg` - Birthday child blowing out candles
- `play-area-adventures.jpg` - Kids playing in playground equipment
- `group-photo-joy.jpg` - Group photo of party guests

### About Section (4 images)
- `children-playing-happily.jpg` - Main hero image of kids playing
- `team-photo.jpg` - Staff member profile photo
- `founders-photo.jpg` - Business founders photo
- `full-team-photo.jpg` - Complete team photo

### Parties Section (2 images)
- `epic-party-action.jpg` - Dynamic party celebration shot
- `party-setup.jpg` - Decorated party room setup

### Community Section (4 images)
- `community-outreach.jpg` - Families volunteering together
- `birthday-celebration-play.jpg` - Party in progress
- `holiday-decorations.jpg` - Holiday decorated play center
- `parents-chatting.jpg` - Parents socializing while kids play

## Cost Estimate

DALL-E 3 pricing (as of 2024):
- Standard quality (1024×1024): $0.040 per image
- **Total cost for 16 images: ~$0.64**

## Troubleshooting

### "Command not found: python"
Try `python3` instead of `python`

### "Permission denied" on bash script
Run: `chmod +x generate-images.sh`

### API Key Issues
- Make sure your OpenAI account has billing set up
- Check that your API key is correct and active
- Ensure you have sufficient credits

### Image Generation Fails
- Check your internet connection
- Verify your OpenAI API key is valid
- Some prompts might be rejected - the script will continue with others

## After Generation

Once images are generated:

1. **Review Images**: Check `/public/images/` folder
2. **Test Website**: Run `npm run dev` to see images in action
3. **Update Components**: Follow `update-images.md` guide
4. **Commit Changes**: 
   ```bash
   git add public/images/
   git commit -m "📸 Add DALL-E 3 generated images"
   git push origin main
   ```

## Image Specifications

All generated images will be:
- **Format**: JPG
- **Size**: 1024×1024px (optimized for web)
- **Style**: Photorealistic
- **Theme**: Indoor play center, bright and welcoming
- **Content**: Diverse families, ages 0-6, safe environment

Your Busy Bees website will look amazing with these professional, photorealistic images! 🐝✨
