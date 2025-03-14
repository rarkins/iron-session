import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { withIronSessionApiRoute, withIronSessionSsr } from ".";
const password = "Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0";
const cookieName = "test";

// same structure as other tests otherwise linting will fail because you can have only one per running eslint
declare module "iron-session" {
  interface IronSessionData {
    user?: { id: number; meta?: string };
    admin?: boolean;
  }
}

test("withIronSessionApiRoute: req.session exists", async () => {
  const wrappedHandler = withIronSessionApiRoute(
    function handler(req) {
      expect(req.session).toMatchInlineSnapshot(`Object {}`);
    },
    {
      password,
      cookieName,
    },
  );

  await wrappedHandler(getDefaultReq(), getDefaultRes());
});

test("withIronSessionApiRoute: req.session.save creates a cookie", async () => {
  const wrappedHandler = withIronSessionApiRoute(
    async function handler(req, res) {
      expect(req.session).toMatchInlineSnapshot(`Object {}`);
      req.session.user = { id: 200 };
      await req.session.save();
      const headerName = (res.setHeader as jest.Mock).mock.calls[0][0];
      expect(headerName).toMatchInlineSnapshot(`"set-cookie"`);

      const headerValue = (res.setHeader as jest.Mock).mock.calls[0][1];
      expect(Array.isArray(headerValue)).toBe(true);
      expect(headerValue).toHaveLength(1);

      const cookie = headerValue[0];
      const seal = cookie.split(";")[0].split("=")[1];
      expect(seal).toHaveLength(265);

      const cookieParams = cookie.split(";").slice(1).join(";");
      expect(cookieParams).toMatchInlineSnapshot(
        `" Max-Age=1295940; Path=/; HttpOnly; Secure; SameSite=Lax"`,
      );
    },
    {
      password,
      cookieName,
    },
  );

  await wrappedHandler(getDefaultReq(), getDefaultRes());
});

test("withIronSessionApiRoute: req.session.destroy removes the cookie", async () => {
  const wrappedHandler = withIronSessionApiRoute(
    async function handler(req, res) {
      req.session.user = { id: 300 };
      await req.session.save();
      expect(req.session).toMatchInlineSnapshot(`
        Object {
          "user": Object {
            "id": 300,
          },
        }
      `);
      req.session.destroy();
      expect(req.session).toMatchInlineSnapshot(`Object {}`);
      expect((res.setHeader as jest.Mock).mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          "set-cookie",
          Array [
            "test=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
          ],
        ]
      `);
    },
    {
      password,
      cookieName,
    },
  );

  await wrappedHandler(getDefaultReq(), getDefaultRes());
});

test("withIronSessionApiRoute: full session rewrite works too", async () => {
  const wrappedHandler = withIronSessionApiRoute(
    async function handler(req) {
      req.session.user = { id: 200 };
      await req.session.save();
      expect(req.session).toMatchInlineSnapshot(`
        Object {
          "user": Object {
            "id": 200,
          },
        }
      `);
      // @ts-ignore TypeScript warns about save and destroy not being here,
      // so this example is most probably to catch misuage of the API and because it works the same as destructuring code wise
      req.session = {
        admin: true,
      };
      expect(req.session).toMatchInlineSnapshot(`
        Object {
          "admin": true,
        }
      `);
    },
    {
      password,
      cookieName,
    },
  );

  await wrappedHandler(getDefaultReq(), getDefaultRes());
});

test("withIronSessionApiRoute: req.session can be overridden, save and destroy will stay", async () => {
  const wrappedHandler = withIronSessionApiRoute(
    async function handler(req) {
      req.session = {
        ...req.session,
        user: { id: 400 },
      };
      await req.session.save();
      expect(req.session).toMatchInlineSnapshot(`
        Object {
          "user": Object {
            "id": 400,
          },
        }
      `);
    },
    {
      password,
      cookieName,
    },
  );

  await wrappedHandler(getDefaultReq(), getDefaultRes());
});

test("withIronSessionSsr: req.session exists", async () => {
  const getServerSideProps = withIronSessionSsr(
    async function getServerSideProps({ req }) {
      expect(req.session).toMatchInlineSnapshot(`Object {}`);
      return { props: {} };
    },
    {
      password,
      cookieName,
    },
  );

  await getServerSideProps({
    req: getDefaultReq(),
    res: getDefaultRes(),
  } as unknown as GetServerSidePropsContext);
});

function getDefaultReq() {
  return {
    headers: {},
    socket: {
      encrypted: true,
    },
  } as unknown as NextApiRequest;
}

function getDefaultRes() {
  return {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as NextApiResponse;
}
