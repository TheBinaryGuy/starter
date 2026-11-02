import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from 'react-email';

/*
 * One message, one action: a heading, a sentence, a button, and the link
 * spelled out for clients that drop buttons. Every auth email uses it; add a
 * template beside it when a message needs more than that.
 */
export type ActionEmailProps = {
    appName: string;
    preview: string;
    heading: string;
    body: string;
    action: string;
    url: string;
    footer: string;
};

const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

export default function ActionEmail(props: ActionEmailProps) {
    return (
        <Html lang="en">
            <Head />
            <Preview>{props.preview}</Preview>
            <Body style={{ margin: 0, backgroundColor: '#fafafa', fontFamily: sans }}>
                <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>
                    <Section
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e5e5',
                            borderRadius: '12px',
                            padding: '32px',
                        }}
                    >
                        <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                            {props.appName}
                        </Text>
                        <Heading
                            as="h1"
                            style={{
                                margin: '24px 0 8px',
                                fontSize: '20px',
                                lineHeight: '28px',
                                color: '#0a0a0a',
                            }}
                        >
                            {props.heading}
                        </Heading>
                        <Text
                            style={{
                                margin: 0,
                                fontSize: '15px',
                                lineHeight: '24px',
                                color: '#404040',
                            }}
                        >
                            {props.body}
                        </Text>
                        <Button
                            href={props.url}
                            style={{
                                display: 'inline-block',
                                marginTop: '24px',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                backgroundColor: '#171717',
                                color: '#fafafa',
                                fontSize: '14px',
                                fontWeight: 500,
                                textDecoration: 'none',
                            }}
                        >
                            {props.action}
                        </Button>
                        <Text
                            style={{
                                margin: '24px 0 0',
                                fontSize: '13px',
                                lineHeight: '20px',
                                color: '#737373',
                            }}
                        >
                            Or open this link: <Link href={props.url}>{props.url}</Link>
                        </Text>
                    </Section>
                    <Text style={{ fontSize: '12px', lineHeight: '18px', color: '#737373' }}>
                        {props.footer}
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

ActionEmail.PreviewProps = {
    appName: 'App',
    preview: 'Confirm your email address.',
    heading: 'Confirm your email',
    body: 'Press the button to finish creating your account.',
    action: 'Confirm email',
    url: 'http://localhost:5173/api/auth/verify-email?token=preview',
    footer: 'If you did not create an account, you can ignore this email.',
} satisfies ActionEmailProps;
