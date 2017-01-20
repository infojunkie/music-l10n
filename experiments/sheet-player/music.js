// music theory (no less)

/** STORY **

We want to be able to say stuff like:

notes( G7 ) == [ G, B, D, F ]

chord( [ G, B, D, F ] ).name() == 'G7'

inversions( G7 ) == [
  [ G, B, D, F ], // inversion( 0, G7 )
  [ B, D, F, G ], // inversion( 1, G7 )
  [ D, F, G, B ], // inversion( 2, G7 )
  [ F, G, B, D ], // inversion( 3, F7 )

  [ G, D, F, B ], // inversion( 0, G7 )
  [ B, F, G, D ], // inversion( 1, G7 )
  [ D, G, B, F ], // inversion( 2, G7 )
  [ F, B, D, G ], // inversion( 3, G7 )

  [ G, F, B, D ], // inversion( 0, G7 )
  [ B, G, D, F ], // inversion( 1, G7 )
  [ D, B, F, G ], // inversion( 2, G7 )
  [ F, D, G, B ], // inversion( 3, G7 )

  [ G, B, F, D ], // inversion( 0, G7 )
  [ B, D, G, F ], // inversion( 1, G7 )
  [ D, F, B, G ], // inversion( 2, G7 )
  [ F, G, D, B ], // inversion( 3, F7 )

  [ G, D, B, F ], // inversion( 0, G7 )
  [ B, F, D, G ], // inversion( 1, G7 )
  [ D, G, F, B ], // inversion( 2, G7 )
  [ F, B, G, D ], // inversion( 3, G7 )

  [ G, F, D, B ], // inversion( 0, G7 )
  [ B, G, F, D ], // inversion( 1, G7 )
  [ D, B, G, F ], // inversion( 2, G7 )
  [ F, D, B, G ]  // inversion( 3, G7 )
]

enumerate permutations: https://gist.github.com/MarkNixon/ef896d2936b425de6138

root( G7 ) == G
third( G7 ) == B
fifth( G7 ) == D
seventh( G7 ) == F

guide_tones( G7 ) == [ [ B, F ], [ F, B ] ]
guide_tones( C7 ) == [ [ E, Bb ], [ Bb, E ] ]

distance( B, E ) == 5
distance( E, B ) == 5 (12 - 7)

distance( [ B, F ], [ E, Bb ] ) == sqrt( 25 + 25 ) == 7.071067812
distance( [ B, F ], [ Bb, E ] ) == sqrt( 2 )
