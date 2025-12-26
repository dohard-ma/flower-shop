import { Welcome } from "@/components/Welcome/Welcome";
import { Container, Stack, Title } from "@mantine/core";

export default function Dashboard() {
  return (
    <Container size="lg">
      <Stack gap="xl">
        <Title order={1}>面板</Title>
        <Welcome />
      </Stack>
    </Container>
  )
}
