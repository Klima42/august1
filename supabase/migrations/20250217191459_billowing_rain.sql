/*
  # Create recipes table and policies

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `profile_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `ingredients` (jsonb[])
      - `instructions` (jsonb[])
      - `cooking_time` (integer)
      - `difficulty_level` (text)
      - `servings` (integer)
      - `tags` (text[])
      - `image_url` (text)
      - `is_favorite` (boolean)
      - `source` (text)
      - `notes` (text)

  2. Security
    - Enable RLS on recipes table
    - Add policies for CRUD operations
    - Create indexes for performance
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can read own recipes'
  ) THEN
    DROP POLICY "Users can read own recipes" ON recipes;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can insert own recipes'
  ) THEN
    DROP POLICY "Users can insert own recipes" ON recipes;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can update own recipes'
  ) THEN
    DROP POLICY "Users can update own recipes" ON recipes;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can delete own recipes'
  ) THEN
    DROP POLICY "Users can delete own recipes" ON recipes;
  END IF;
END $$;

-- Create recipes table if it doesn't exist
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  ingredients jsonb[] NOT NULL DEFAULT '{}',
  instructions jsonb[] NOT NULL DEFAULT '{}',
  cooking_time integer,
  difficulty_level text CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
  servings integer,
  tags text[] DEFAULT '{}',
  image_url text,
  is_favorite boolean DEFAULT false,
  source text CHECK (source IN ('user', 'ai', 'imported')) DEFAULT 'user',
  notes text
);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for recipes
CREATE POLICY "Users can read own recipes"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own recipes"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own recipes"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS recipes_profile_id_idx ON recipes(profile_id);
CREATE INDEX IF NOT EXISTS recipes_tags_idx ON recipes USING GIN(tags);