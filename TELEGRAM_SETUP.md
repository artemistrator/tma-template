# Telegram Integration Guide

## Overview

This Mini App is integrated with Telegram WebApp API for:
1. **User Authentication** - Get user data from Telegram
2. **Contact Request** - Request user's phone number via Telegram
3. **Order Notifications** - Send order details to admin's Telegram
4. **Native Payments** - Process payments via Telegram Payments

## Setup Instructions

### 1. Create Telegram Bot

1. Open Telegram and find [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. **Save the Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Your Telegram User ID

1. Open Telegram and find [@userinfobot](https://t.me/userinfobot)
2. Send `/start` command
3. **Save your User ID** (numeric value)

### 3. Configure Environment Variables

Edit `.env.local` file:

```bash
# Telegram Admin Notification
TELEGRAM_ADMIN_ID=your_user_id_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Features

### Request Phone Number

Users can share their phone number directly from Telegram:

1. User clicks "Get from TG" button
2. Telegram shows native contact request popup
3. User approves sharing
4. Phone number is saved to form

### Order Notifications to Admin

When an order is placed, admin receives a Telegram message with:
- Order ID and total
- Customer information
- Shipping address
- Items list

## Troubleshooting

### "User cancelled phone request or error occurred"

**Possible causes:**
- Running outside Telegram (browser instead of Telegram WebApp)
- User cancelled the request
- Bot API version too old

**Solutions:**
1. Make sure you're opening the app **inside Telegram**
2. Update Telegram app to latest version
