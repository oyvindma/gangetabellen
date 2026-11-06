Feature: Gangetabellen - math practice game
  As a child practising arithmetic
  I want to answer generated problems and get immediate feedback, points and progress
  So that practising is motivating and I can focus on the numbers and operations I choose

  Background:
    Given I have opened the page

  # ---------------------------------------------------------------
  # Problem generation
  # ---------------------------------------------------------------

  Scenario: Initial test on page load
    Then 100 problems are shown
    And the numbers 1 to 10 are ticked
    And only the operation "multiply" is ticked
    And the problems are in random order
    And the points, streak and best streak all show 0
    And the progress bar is empty

  Scenario Outline: Each operation produces valid problems
    Given only the operation "<operation>" is ticked
    And only the number <n> is ticked
    Then every problem has the form "<form>" with a second operand between 1 and 10
    And every correct answer is a whole non-negative number

    Examples:
      | operation | n | form                      |
      | multiply  | 7 | 7 × j                     |
      | divide    | 7 | (7 × j) ÷ j, answer is 7  |
      | add       | 7 | 7 + j                     |
      | subtract  | 7 | max(7, j) − min(7, j)     |

  Scenario: Problems are spread evenly over selected operations
    Given the operations "multiply" and "add" are ticked
    Then 50 problems are multiplication and 50 are addition

  Scenario: Uneven split gives the remainder to the first operations
    Given the operations "multiply", "divide" and "add" are ticked
    Then there are 34 multiplication, 33 division and 33 addition problems

  Scenario: Selected numbers are all practised
    Given all numbers 1 to 10 and the operation "multiply" are ticked
    Then every selected number appears among the problems

  Scenario: Small selections repeat problems
    Given only the number 1 and the operation "multiply" are ticked
    Then 100 problems are shown
    And each of the 10 distinct problems appears 10 times

  Scenario: Defaults when no number is selected
    When I untick every number
    Then the numbers 1 to 10 are ticked again
    And 100 problems are shown

  Scenario: Default when no operation is selected
    When I untick every operation
    Then the operation "multiply" is ticked again
    And 100 multiplication problems are shown

  Scenario: Changing a control starts a new test
    Given I have answered some problems and have points
    When I tick or untick any number or operation
    Then new problems are generated
    And the points, streak, best streak and progress bar are reset to 0

  # ---------------------------------------------------------------
  # Answering and feedback
  # ---------------------------------------------------------------

  Scenario Outline: Answer is checked when I leave the field or press a key
    Given a problem with the correct answer 42
    When I type "<input>" and <action>
    Then the field is marked "<state>" with the symbol "<symbol>"

    Examples:
      | input | action          | state     | symbol |
      | 42    | press Enter     | correct   | ✓      |
      | 42    | press Tab       | correct   | ✓      |
      | 42    | leave the field | correct   | ✓      |
      | 41    | press Enter     | incorrect | ✗      |
      | 4a    | press Enter     | invalid   | !      |

  Scenario: Surrounding spaces are ignored
    Given a problem with the correct answer 42
    When I type " 42 " and leave the field
    Then the field contains "42"
    And the field is marked correct

  Scenario: Empty answer shows no feedback
    Given a problem I have previously answered wrongly
    When I clear the field and leave it
    Then the field has no feedback symbol and no colour

  Scenario: Enter moves focus to the next problem
    Given the focus is in problem number 3
    When I type an answer and press Enter
    Then the focus moves to problem number 4

  Scenario: Answer length is limited
    Then an answer field accepts at most 3 characters
    And a numeric keypad is offered on touch devices

  # ---------------------------------------------------------------
  # Points and streak
  # ---------------------------------------------------------------

  Scenario: First correct answer gives points
    When I answer a problem correctly
    Then I get 10 points
    And the streak is 1
    And the best streak is 1

  Scenario: Streak bonus every 5 correct answers
    When I answer 5 problems correctly in a row
    Then the 5th answer gives 20 points
    And the total is 60 points

  Scenario: Wrong answer resets the streak but keeps points and best streak
    Given I have a streak of 3 and 30 points
    When I answer a problem wrongly
    Then the streak is 0
    And the points are still 30
    And the best streak is still 3

  Scenario: Correcting a wrong answer gives points once
    Given I answered a problem wrongly
    When I change the answer to the correct one
    Then I get points and the streak becomes 1

  Scenario: Re-checking a correct answer gives no extra points
    Given I answered a problem correctly
    When I leave and re-enter the field and leave it again
    Then the points and streak are unchanged

  # ---------------------------------------------------------------
  # Progress
  # ---------------------------------------------------------------

  Scenario: Progress counts each answered problem once
    Given 100 problems are shown
    When I answer 25 different problems
    Then the progress bar is 25% full

  Scenario: Wrong answers also count as answered
    When I answer a problem wrongly and leave the field
    Then the progress bar advances by 1%

  Scenario: Re-answering does not advance progress
    Given I have answered a problem
    When I change its answer and leave the field
    Then the progress bar does not change

  Scenario: Empty fields do not count as answered
    When I focus a field and leave it without typing
    Then the progress bar does not change

  # ---------------------------------------------------------------
  # Order
  # ---------------------------------------------------------------

  Scenario: Sorted order is sequential down each column
    When I turn on "Sortert rekkefølge"
    Then new problems are generated and the score is reset
    And the problems are ordered by first operand and then by second operand
    And reading each column from top to bottom follows that sequence

  Scenario Outline: Sorted order adapts to the number of columns
    Given "Sortert rekkefølge" is on
    And the screen shows <columns> columns
    Then each column reads from top to bottom in sequence

    Examples:
      | columns |
      | 2       |
      | 3       |
      | 4       |

  Scenario: Resizing keeps my answers
    Given "Sortert rekkefølge" is on
    And I have answered some problems
    When the screen is resized so the number of columns changes
    Then the problems are rearranged
    And my answers, feedback, points and progress are unchanged

  Scenario: Random order
    When I turn off "Sortert rekkefølge"
    Then new problems are generated in random order

  # ---------------------------------------------------------------
  # Show answers
  # ---------------------------------------------------------------

  Scenario: Show answers
    Given I have answered some problems
    When I turn on "Vis svar"
    Then every field shows its correct answer and is read-only
    And no feedback symbols or colours are shown
    And the points panel and progress bar are hidden
    And the score and progress are reset

  Scenario: Hide answers
    Given "Vis svar" is on
    When I turn it off
    Then every field is empty and editable
    And the points panel and progress bar are shown with 0 points and 0% progress

  Scenario: Viewing answers does not count as answering
    Given "Vis svar" is on
    When I focus and leave a field
    Then the progress is not changed

  Scenario: New problems respect "Vis svar"
    Given "Vis svar" is on
    When I change a number or operation
    Then the new problems are shown with their answers filled in
    And the points panel and progress bar stay hidden

  # ---------------------------------------------------------------
  # Layout and printing
  # ---------------------------------------------------------------

  Scenario: Responsive grid
    Then the problems are shown in 2 columns on small screens
    And in 3 columns on tablets
    And in 4 columns on desktop

  Scenario: Progress bar stays visible while scrolling
    When I scroll down the problem list
    Then the progress bar remains visible

  Scenario: Printing
    When I print the page
    Then the problems are shown in 4 columns
    And the controls, points panel and progress bar are not printed

  Scenario: Norwegian user interface
    Then all labels and messages are in Norwegian
