import type { Meta, StoryObj } from '@storybook/react';
import { useToast } from '@/hooks/ui/use-toast';
import { Button } from '@/components/ui/button';

const meta: Meta = {
  title: 'UI/Toast',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;

const ToastDemo = () => {
  const { toast } = useToast();

  return (
    <Button
      onClick={() => {
        toast({
          title: 'Notification',
          description: 'This is a toast notification message.',
        });
      }}
    >
      Show Toast
    </Button>
  );
};

export const Default: StoryObj = {
  render: () => <ToastDemo />,
};

export const Success: StoryObj = {
  render: () => {
    const SuccessToast = () => {
      const { toast } = useToast();

      return (
        <Button
          variant="default"
          onClick={() => {
            toast({
              variant: 'success',
              title: 'Success',
              description: 'Operation completed successfully!',
            });
          }}
        >
          Success
        </Button>
      );
    };
    return <SuccessToast />;
  },
};

export const Error: StoryObj = {
  render: () => {
    const ErrorToast = () => {
      const { toast } = useToast();

      return (
        <Button
          variant="destructive"
          onClick={() => {
            toast({
              variant: 'error',
              title: 'Error',
              description: 'Something went wrong. Please try again.',
            });
          }}
        >
          Error
        </Button>
      );
    };
    return <ErrorToast />;
  },
};

export const Info: StoryObj = {
  render: () => {
    const InfoToast = () => {
      const { toast } = useToast();

      return (
        <Button
          variant="outline"
          onClick={() => {
            toast({
              variant: 'info',
              title: 'Info',
              description: 'This is an informational message.',
            });
          }}
        >
          Info
        </Button>
      );
    };
    return <InfoToast />;
  },
};

export const Warning: StoryObj = {
  render: () => {
    const WarningToast = () => {
      const { toast } = useToast();

      return (
        <Button
          variant="outline"
          onClick={() => {
            toast({
              variant: 'warning',
              title: 'Warning',
              description: 'This is a warning message.',
            });
          }}
        >
          Warning
        </Button>
      );
    };
    return <WarningToast />;
  },
};

export const WithTitle: StoryObj = {
  render: () => {
    const ToastWithTitle = () => {
      const { toast } = useToast();

      return (
        <Button
          onClick={() => {
            toast({
              title: 'Scheduled: Clipboard backup',
              description: 'Sunday, February 28, 2024 at 6:23 PM',
            });
          }}
        >
          Show with Title
        </Button>
      );
    };
    return <ToastWithTitle />;
  },
};

export const AllVariants: StoryObj = {
  render: () => {
    const ToastVariants = () => {
      const { toast } = useToast();

      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="default"
            onClick={() => {
              toast({
                variant: 'success',
                title: 'Success',
                description: 'Operation completed successfully!',
              });
            }}
          >
            Success
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              toast({
                variant: 'error',
                title: 'Error',
                description: 'Something went wrong. Please try again.',
              });
            }}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast({
                variant: 'info',
                title: 'Info',
                description: 'This is an informational message.',
              });
            }}
          >
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast({
                variant: 'warning',
                title: 'Warning',
                description: 'This is a warning message.',
              });
            }}
          >
            Warning
          </Button>
        </div>
      );
    };
    return <ToastVariants />;
  },
};
