import { CountryBadge } from '@/components/human/CountryBadge';
import { Timer } from '@/components/human/Timer';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { AppError } from '@/lib/errors';
import { fireEvent, render, screen } from '@/test-utils/render';

describe('Button', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Remember this Human" onPress={onPress} />);

    fireEvent.press(screen.getByText('Remember this Human'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button disabled label="Disabled" onPress={onPress} />);

    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes its disabled state to assistive technology', async () => {
    await render(<Button disabled label="Disabled" onPress={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Avatar', () => {
  it('falls back to a single initial, never a surname', async () => {
    await render(<Avatar name="Aya" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('uppercases the initial', async () => {
    await render(<Avatar name="aya" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('labels itself with the name for VoiceOver', async () => {
    await render(<Avatar name="Bashir" />);
    expect(screen.getByLabelText('Bashir')).toBeTruthy();
  });
});

describe('CountryBadge', () => {
  it('shows the flag and the origin', async () => {
    await render(<CountryBadge city="Kyoto" countryCode="JP" />);
    expect(screen.getByText('🇯🇵')).toBeTruthy();
    expect(screen.getByText(/Kyoto/)).toBeTruthy();
  });

  it('omits the city when it is not given (Article 8.2)', async () => {
    await render(<CountryBadge countryCode="JP" />);
    expect(screen.queryByText(/Kyoto/)).toBeNull();
  });

  it('can hide the flag', async () => {
    await render(<CountryBadge countryCode="DE" showFlag={false} />);
    expect(screen.queryByText('🇩🇪')).toBeNull();
  });
});

describe('QuestionCard', () => {
  const base = {
    question: 'What is something people misunderstand about your country?',
    votes: 342,
    hasVoted: false,
    canVote: true,
    onVote: jest.fn(),
  };

  it('offers "Ask this", never a downvote (Article 9.3)', async () => {
    await render(<QuestionCard {...base} />);

    expect(screen.getByText('Ask this')).toBeTruthy();
    expect(screen.queryByText(/downvote/i)).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
    expect(screen.queryByText('▽')).toBeNull();
  });

  it('votes when pressed', async () => {
    const onVote = jest.fn();
    await render(<QuestionCard {...base} onVote={onVote} />);

    fireEvent.press(screen.getByLabelText('Ask this'));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it('does not let a guest vote (Article 6.1)', async () => {
    const onVote = jest.fn();
    await render(<QuestionCard {...base} canVote={false} onVote={onVote} />);

    fireEvent.press(screen.getByLabelText('Ask this'));
    expect(onVote).not.toHaveBeenCalled();
  });

  it('shows an answer only when there is one', async () => {
    const answer = 'That we are careful, not formal.';
    const { rerender } = await render(
      <QuestionCard {...base} answer={answer} />
    );
    expect(screen.getByText(answer)).toBeTruthy();

    await rerender(<QuestionCard {...base} answer={null} />);
    expect(screen.queryByText(answer)).toBeNull();
  });
});

describe('Timer', () => {
  it('renders a padded countdown for the given instant', async () => {
    await render(
      <Timer cycleDate="2027-03-10" now={new Date('2027-03-10T05:16:48Z')} />
    );
    expect(screen.getByText('18:43:12 remaining')).toBeTruthy();
  });

  it('shows zero rather than a negative time once the cycle ends', async () => {
    await render(
      <Timer cycleDate="2027-03-10" now={new Date('2027-03-11T09:00:00Z')} />
    );
    expect(screen.getByText('00:00:00 remaining')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders title, body and an optional action', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        action={{ label: 'Meet a random Human', onPress }}
        body="It begins with Human #0001."
        title="The Archive is still empty"
      />
    );

    expect(screen.getByText('The Archive is still empty')).toBeTruthy();
    fireEvent.press(screen.getByText('Meet a random Human'));
    expect(onPress).toHaveBeenCalled();
  });

  it('works without a body or an action', async () => {
    await render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('translates the error key and never shows a raw server message', async () => {
    await render(
      <ErrorState error={new AppError('network', 'common.error')} />
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.queryByText(/network:/)).toBeNull();
  });

  it('offers a retry when one is given', async () => {
    const onRetry = jest.fn();
    await render(
      <ErrorState error={new AppError('network')} onRetry={onRetry} />
    );

    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
  });
});
