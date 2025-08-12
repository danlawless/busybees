#!/bin/bash

# Busy Bees Image Generation Script
# Generates all website images using OpenAI's DALL-E 3 API

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: Please set your OpenAI API key"
    echo "Run: export OPENAI_API_KEY='your-key-here'"
    exit 1
fi

# Create images directory
mkdir -p public/images

echo "🐝 Busy Bees Image Generation Script"
echo "====================================="
echo "📁 Images will be saved to: $(pwd)/public/images"
echo ""

# Counter for success/failure
SUCCESS=0
FAILED=0

# Function to generate image
generate_image() {
    local filename="$1"
    local prompt="$2"
    local filepath="public/images/$filename"
    
    # Skip if image already exists
    if [ -f "$filepath" ]; then
        echo "⏭️  Skipping $filename (already exists)"
        return 0
    fi
    
    echo "🎨 Generating $filename..."
    
    # Create the API request
    local response=$(curl -s -X POST "https://api.openai.com/v1/images/generations" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"dall-e-3\",
            \"prompt\": \"$prompt\",
            \"size\": \"1024x1024\",
            \"quality\": \"standard\",
            \"n\": 1
        }")
    
    # Extract image URL from response
    local image_url=$(echo "$response" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$image_url" ]; then
        # Download the image
        if curl -s -o "$filepath" "$image_url"; then
            echo "✅ Successfully generated $filename"
            ((SUCCESS++))
        else
            echo "❌ Failed to download $filename"
            ((FAILED++))
        fi
    else
        echo "❌ Failed to generate $filename"
        echo "Response: $response"
        ((FAILED++))
    fi
    
    echo ""
}

# Generate all images
echo "Starting image generation..."
echo ""

generate_image "princess-party-magic.jpg" "Photorealistic image of a birthday girl wearing a pink princess dress with sparkly tiara, surrounded by 4-5 other young children (ages 4-6) in colorful princess costumes, all playing happily in a bright, modern indoor play center with soft play equipment visible in background, natural lighting, joyful expressions, high quality, professional photography"

generate_image "superhero-squad.jpg" "Photorealistic image of 5-6 children (ages 3-6) wearing colorful superhero capes and masks, striking heroic poses in a clean, modern indoor playground, bright lighting, colorful soft play structures in background, kids laughing and having fun, professional photography style"

generate_image "face-painting-fun.jpg" "Photorealistic image of a professional female face painter in her 30s painting a butterfly design on a smiling 5-year-old girl's cheek, other children waiting excitedly in line, bright indoor play center setting, colorful face paints visible, warm natural lighting, candid moment"

generate_image "birthday-cake-moment.jpg" "Photorealistic image of a birthday child (age 5) blowing out candles on a colorful birthday cake, surrounded by friends and family singing, indoor play center party room setting, balloons and decorations visible, warm lighting, genuine happy expressions, celebration atmosphere"

generate_image "play-area-adventures.jpg" "Photorealistic wide shot of children (ages 2-6) actively playing in a modern indoor playground with colorful soft play structures, climbing equipment, and slides, bright clean environment, kids laughing and playing together, parents supervising in background, professional lighting"

generate_image "group-photo-joy.jpg" "Photorealistic group photo of 8-10 children (ages 3-7) and 3-4 adults posed together in front of colorful indoor play equipment, everyone smiling and happy, birthday child in center wearing party hat, bright modern play center background, professional family photo style"

generate_image "children-playing-happily.jpg" "Photorealistic image of diverse group of young children (ages 1-6) playing together in a bright, clean indoor play center, soft play equipment, slides, and climbing structures visible, natural lighting through large windows, children laughing and engaged in play, safe and welcoming environment"

generate_image "team-photo.jpg" "Photorealistic professional headshot-style photo of friendly female staff member in her 20s-30s, wearing casual professional clothing, warm smile, indoor play center background slightly blurred, natural lighting, approachable and trustworthy appearance"

generate_image "founders-photo.jpg" "Photorealistic photo of a husband and wife in their 30s-40s, both smiling warmly, standing together in their indoor play center, casual professional attire, friendly and approachable expressions, colorful play equipment softly blurred in background, natural lighting, family business owners"

generate_image "full-team-photo.jpg" "Photorealistic group photo of 4-5 diverse staff members (mix of ages 20s-40s) standing together in bright indoor play center, all wearing matching polo shirts or casual uniforms, friendly smiles, colorful play equipment in background, professional but warm atmosphere"

generate_image "epic-party-action.jpg" "Photorealistic dynamic shot of children (ages 4-7) in the middle of an exciting birthday party, kids jumping, dancing, and celebrating with pure joy, colorful party decorations, balloons, indoor play center setting, motion and energy captured, bright happy lighting"

generate_image "party-setup.jpg" "Photorealistic image of a beautifully decorated birthday party setup in an indoor play center party room, colorful balloons, streamers, table with party supplies, birthday cake on table, bright clean modern setting, ready for celebration"

generate_image "community-outreach.jpg" "Photorealistic image of families with children volunteering together at a community event, parents and kids working side by side, indoor setting, warm community atmosphere, diverse group of people helping others, genuine smiles and cooperation"

generate_image "birthday-celebration-play.jpg" "Photorealistic image of a birthday party in progress in an indoor play center, children playing on equipment while wearing party hats, parents chatting nearby, birthday decorations visible, natural candid moment, warm lighting"

generate_image "holiday-decorations.jpg" "Photorealistic image of indoor play center decorated for holidays, colorful seasonal decorations, children and families enjoying special holiday activities, festive atmosphere, bright welcoming environment, professional photography"

generate_image "parents-chatting.jpg" "Photorealistic image of 3-4 parents (diverse group) sitting and chatting comfortably while their children play in background, coffee cups visible, relaxed social atmosphere, modern indoor play center seating area, natural candid moment"

echo "====================================="
echo "✅ Successfully generated: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "📁 Images saved to: $(pwd)/public/images"

if [ $SUCCESS -gt 0 ]; then
    echo ""
    echo "🎉 Next steps:"
    echo "1. Review the generated images"
    echo "2. Run the website to see them in action"
    echo "3. Follow update-images.md to integrate them"
fi
