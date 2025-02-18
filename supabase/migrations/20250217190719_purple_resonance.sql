/*
  # Initial Schema Setup

  1. New Tables
    - `profiles`
      - User profiles with cooking preferences and settings
    - `conversations`
      - Chat conversations linked to profiles
    - `messages`
      - Individual messages within conversations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  age integer NOT NULL,
  dietary_restrictions text[] DEFAULT '{}',
  other_restrictions text,
  cooking_level text NOT NULL,
  appliances text[] DEFAULT '{}',
  description text
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  last_updated timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('user', 'ai')),
  image_url text,
  is_error boolean DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policies for conversations
CREATE POLICY "Users can read own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

-- Create policies for messages
CREATE POLICY "Users can read messages from own conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert messages in own conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  ));