#!/usr/bin/env python3
"""
Busy Bees Image Generation Script
Generates all website images using OpenAI's DALL-E 3 API
"""

import os
import requests
from openai import OpenAI
import json
from pathlib import Path

# You'll need to set your OpenAI API key
# Either set it as an environment variable: export OPENAI_API_KEY="your-key-here"
# Or replace None with your API key string: OPENAI_API_KEY = "your-key-here"
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

if not OPENAI_API_KEY:
    print("❌ Error: Please set your OpenAI API key")
    print("Run: export OPENAI_API_KEY='your-key-here'")
    print("Or edit this script to add your key directly")
    exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

# Create images directory
images_dir = Path("public/images")
images_dir.mkdir(parents=True, exist_ok=True)

# Image prompts with filenames
image_prompts = [
    {
        "filename": "princess-party-magic.jpg",
        "prompt": "Photorealistic image of a birthday girl wearing a pink princess dress with sparkly tiara, surrounded by 4-5 other young children (ages 4-6) in colorful princess costumes, all playing happily in a bright, modern indoor play center with soft play equipment visible in background, natural lighting, joyful expressions, high quality, professional photography"
    },
    {
        "filename": "superhero-squad.jpg",
        "prompt": "Photorealistic image of 5-6 children (ages 3-6) wearing colorful superhero capes and masks, striking heroic poses in a clean, modern indoor playground, bright lighting, colorful soft play structures in background, kids laughing and having fun, professional photography style"
    },
    {
        "filename": "face-painting-fun.jpg",
        "prompt": "Photorealistic image of a professional female face painter in her 30s painting a butterfly design on a smiling 5-year-old girl's cheek, other children waiting excitedly in line, bright indoor play center setting, colorful face paints visible, warm natural lighting, candid moment"
    },
    {
        "filename": "birthday-cake-moment.jpg",
        "prompt": "Photorealistic image of a birthday child (age 5) blowing out candles on a colorful birthday cake, surrounded by friends and family singing, indoor play center party room setting, balloons and decorations visible, warm lighting, genuine happy expressions, celebration atmosphere"
    },
    {
        "filename": "play-area-adventures.jpg",
        "prompt": "Photorealistic wide shot of children (ages 2-6) actively playing in a modern indoor playground with colorful soft play structures, climbing equipment, and slides, bright clean environment, kids laughing and playing together, parents supervising in background, professional lighting"
    },
    {
        "filename": "group-photo-joy.jpg",
        "prompt": "Photorealistic group photo of 8-10 children (ages 3-7) and 3-4 adults posed together in front of colorful indoor play equipment, everyone smiling and happy, birthday child in center wearing party hat, bright modern play center background, professional family photo style"
    },
    {
        "filename": "children-playing-happily.jpg",
        "prompt": "Photorealistic image of diverse group of young children (ages 1-6) playing together in a bright, clean indoor play center, soft play equipment, slides, and climbing structures visible, natural lighting through large windows, children laughing and engaged in play, safe and welcoming environment"
    },
    {
        "filename": "team-photo.jpg",
        "prompt": "Photorealistic professional headshot-style photo of friendly female staff member in her 20s-30s, wearing casual professional clothing, warm smile, indoor play center background slightly blurred, natural lighting, approachable and trustworthy appearance"
    },
    {
        "filename": "founders-photo.jpg",
        "prompt": "Photorealistic photo of a husband and wife in their 30s-40s, both smiling warmly, standing together in their indoor play center, casual professional attire, friendly and approachable expressions, colorful play equipment softly blurred in background, natural lighting, family business owners"
    },
    {
        "filename": "full-team-photo.jpg",
        "prompt": "Photorealistic group photo of 4-5 diverse staff members (mix of ages 20s-40s) standing together in bright indoor play center, all wearing matching polo shirts or casual uniforms, friendly smiles, colorful play equipment in background, professional but warm atmosphere"
    },
    {
        "filename": "epic-party-action.jpg",
        "prompt": "Photorealistic dynamic shot of children (ages 4-7) in the middle of an exciting birthday party, kids jumping, dancing, and celebrating with pure joy, colorful party decorations, balloons, indoor play center setting, motion and energy captured, bright happy lighting"
    },
    {
        "filename": "party-setup.jpg",
        "prompt": "Photorealistic image of a beautifully decorated birthday party setup in an indoor play center party room, colorful balloons, streamers, table with party supplies, birthday cake on table, bright clean modern setting, ready for celebration"
    },
    {
        "filename": "community-outreach.jpg",
        "prompt": "Photorealistic image of families with children volunteering together at a community event, parents and kids working side by side, indoor setting, warm community atmosphere, diverse group of people helping others, genuine smiles and cooperation"
    },
    {
        "filename": "birthday-celebration-play.jpg",
        "prompt": "Photorealistic image of a birthday party in progress in an indoor play center, children playing on equipment while wearing party hats, parents chatting nearby, birthday decorations visible, natural candid moment, warm lighting"
    },
    {
        "filename": "holiday-decorations.jpg",
        "prompt": "Photorealistic image of indoor play center decorated for holidays, colorful seasonal decorations, children and families enjoying special holiday activities, festive atmosphere, bright welcoming environment, professional photography"
    },
    {
        "filename": "parents-chatting.jpg",
        "prompt": "Photorealistic image of 3-4 parents (diverse group) sitting and chatting comfortably while their children play in background, coffee cups visible, relaxed social atmosphere, modern indoor play center seating area, natural candid moment"
    }
]

def download_image(url, filepath):
    """Download image from URL and save to filepath"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"❌ Failed to download image: {e}")
        return False

def generate_image(prompt, filename):
    """Generate a single image using DALL-E 3"""
    filepath = images_dir / filename
    
    # Skip if image already exists
    if filepath.exists():
        print(f"⏭️  Skipping {filename} (already exists)")
        return True
    
    try:
        print(f"🎨 Generating {filename}...")
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",  # DALL-E 3 sizes: 1024x1024, 1792x1024, 1024x1792
            quality="standard",  # or "hd" for higher quality (costs more)
            n=1,
        )
        
        image_url = response.data[0].url
        
        if download_image(image_url, filepath):
            print(f"✅ Successfully generated {filename}")
            return True
        else:
            print(f"❌ Failed to save {filename}")
            return False
            
    except Exception as e:
        print(f"❌ Error generating {filename}: {e}")
        return False

def main():
    print("🐝 Busy Bees Image Generation Script")
    print("=====================================")
    print(f"📁 Images will be saved to: {images_dir.absolute()}")
    print(f"🖼️  Total images to generate: {len(image_prompts)}")
    print()
    
    successful = 0
    failed = 0
    
    for i, image_data in enumerate(image_prompts, 1):
        print(f"[{i}/{len(image_prompts)}] ", end="")
        
        if generate_image(image_data["prompt"], image_data["filename"]):
            successful += 1
        else:
            failed += 1
        
        print()  # Add spacing between images
    
    print("=====================================")
    print(f"✅ Successfully generated: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📁 Images saved to: {images_dir.absolute()}")
    
    if successful > 0:
        print("\n🎉 Next steps:")
        print("1. Review the generated images")
        print("2. Run the website to see them in action")
        print("3. Follow update-images.md to integrate them")

if __name__ == "__main__":
    main()
