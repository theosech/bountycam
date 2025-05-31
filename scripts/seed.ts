import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

// This script helps seed test data after you've set up test users

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

async function seed() {
  console.log('Seeding database...')

  try {
    // Get existing users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(2)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    if (!users || users.length < 2) {
      console.log('Please create at least 2 test users through Supabase Auth first')
      console.log('Then run this script again')
      return
    }

    const [user1, user2] = users

    // Create test bounties
    const bounties = [
      {
        creator_id: user1.id,
        title: 'Film the sunset at Santa Monica Pier',
        description: 'Looking for a beautiful sunset timelapse',
        amount: 50,
        lat: 34.0094,
        lng: -118.4973,
      },
      {
        creator_id: user2.id,
        title: 'Live stream from Griffith Observatory',
        description: 'Show the city views and telescope area',
        amount: 75,
        lat: 34.1184,
        lng: -118.3004,
      },
      {
        creator_id: user1.id,
        title: 'Venice Beach street performers',
        description: 'Capture some street art and performances',
        amount: 40,
        lat: 33.9850,
        lng: -118.4695,
      },
      {
        creator_id: user2.id,
        title: 'Hollywood Walk of Fame tour',
        description: 'Quick walking tour showing the stars',
        amount: 60,
        lat: 34.1016,
        lng: -118.3267,
      },
    ]

    const { data: insertedBounties, error: bountiesError } = await supabase
      .from('bounties')
      .insert(bounties)
      .select()

    if (bountiesError) {
      console.error('Error creating bounties:', bountiesError)
      return
    }

    console.log(`Created ${insertedBounties?.length} test bounties`)
    console.log('Seeding completed successfully!')

  } catch (error) {
    console.error('Seed error:', error)
  }
}

seed()