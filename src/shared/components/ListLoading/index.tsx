import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { TextSkeleton } from "@finstreet/ui/components/base/Skeletons/TextSkeleton";
import { VStack, Divider, Grid, Box } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import {
  PageHeader,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { BoxSkeleton } from "@finstreet/ui/components/base/Skeletons/BoxSkeleton";
import { Fragment } from "react";

type ListLoadingProps = {
  title: string;
};

export async function ListLoading({ title }: ListLoadingProps) {
  return (
    <>
      <PageHeader>
        <PageHeaderTitle>
          <Headline as={"h1"}>{title}</Headline>
        </PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <VStack gap={16} alignItems={"stretch"} mt={18}>
          <Grid gridTemplateColumns={"repeat(3, 2fr) 1fr"} px={4}>
            <BoxSkeleton height={16} width={"100%"} />
            <BoxSkeleton height={16} width={"100%"} />
            <BoxSkeleton height={16} width={"100%"} />
            <BoxSkeleton height={16} width={"100%"} />
          </Grid>

          <VStack gap={2} alignItems={"stretch"}>
            <Box px={4}>
              <TextSkeleton lines={1} fontSize={"xl"} />
            </Box>
            <Divider color={"neutral.light"} />

            <Grid gap={12} gridTemplateColumns={"repeat(4, 1fr)"} pt={2} pb={1}>
              <TextSkeleton lines={1} />
              <TextSkeleton lines={1} />
              <TextSkeleton lines={1} />
              <TextSkeleton lines={1} />
            </Grid>

            <Divider color={"neutral.light"} />

            {Array.from({ length: 6 }).map((_, index) => (
              <Fragment key={index}>
                <Grid gap={12} gridTemplateColumns={"repeat(4, 1fr)"} py={8}>
                  <TextSkeleton lines={1} />
                  <TextSkeleton lines={1} />
                  <TextSkeleton lines={1} />
                  <TextSkeleton lines={1} />
                </Grid>
                <Divider color={"neutral.light"} />
              </Fragment>
            ))}
          </VStack>
        </VStack>
      </PageContent>
    </>
  );
}
